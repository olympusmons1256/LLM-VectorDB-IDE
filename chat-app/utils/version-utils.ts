// utils/version-utils.ts
import { deepEqual } from 'lodash';
import type { ProjectVersion, ConflictInfo } from '@/types/version-types';
import type { ProjectState } from '@/store/chat-store';

export function detectChanges(
  oldState: ProjectState,
  newState: ProjectState,
  paths: string[][] = []
): { path: string[], value: any }[] {
  const changes: { path: string[], value: any }[] = [];

  function traverse(old: any, current: any, path: string[] = []) {
    if (old === current) return;
    
    if (typeof old !== 'object' || typeof current !== 'object') {
      changes.push({ path, value: current });
      return;
    }

    const keys = new Set([...Object.keys(old), ...Object.keys(current)]);
    
    for (const key of keys) {
      traverse(old[key], current[key], [...path, key]);
    }
  }

  traverse(oldState, newState);
  return changes.filter(change => 
    !paths.some(excludePath => 
      change.path.length >= excludePath.length &&
      excludePath.every((key, i) => change.path[i] === key)
    )
  );
}

export function findLastCommonVersion(versions: ProjectVersion[]): ProjectVersion {
  for (let i = versions.length - 1; i >= 0; i--) {
    const version = versions[i];
    if (versions.every(v => v.version >= version.version)) {
      return version;
    }
  }
  throw new Error('No common version found');
}

export function mergeChanges(baseState: ProjectState, changes: { path: string[], value: any }[]): ProjectState {
  const newState = JSON.parse(JSON.stringify(baseState));
  
  for (const change of changes) {
    let current = newState;
    for (let i = 0; i < change.path.length - 1; i++) {
      current = current[change.path[i]];
    }
    current[change.path[change.path.length - 1]] = change.value;
  }
  
  return newState;
}

export function detectConflicts(versions: ProjectVersion[]): ConflictInfo | null {
  if (versions.length < 2) return null;

  const lastCommon = findLastCommonVersion(versions);
  const changesPerVersion: { [key: string]: { path: string[], value: any }[] } = {};

  // Detect changes for each version
  for (const version of versions) {
    if (version.version <= lastCommon.version) continue;
    changesPerVersion[version.version] = detectChanges(lastCommon.state, version.state);
  }

  // Check for conflicting changes
  const conflicts: { [key: string]: typeof changesPerVersion } = {};
  const versionsList = Object.keys(changesPerVersion);

  for (let i = 0; i < versionsList.length; i++) {
    const v1 = versionsList[i];
    const changes1 = changesPerVersion[v1];

    for (let j = i + 1; j < versionsList.length; j++) {
      const v2 = versionsList[j];
      const changes2 = changesPerVersion[v2];

      const conflictingPaths = changes1
        .filter(c1 => changes2.some(c2 => deepEqual(c1.path, c2.path)))
        .map(c => c.path.join('.'));

      if (conflictingPaths.length > 0) {
        conflicts[conflictingPaths.join(',')] = {
          [v1]: changes1,
          [v2]: changes2
        };
      }
    }
  }

  if (Object.keys(conflicts).length === 0) return null;

  return {
    versions,
    lastCommonVersion: lastCommon,
    changes: changesPerVersion
  };
}

export function autoResolveConflicts(conflict: ConflictInfo): ProjectState {
  const { lastCommonVersion, changes } = conflict;
  const resolvedState = { ...lastCommonVersion.state };
  
  // Collect all unique paths that have changes
  const allPaths = new Set<string>();
  Object.values(changes).forEach(versionChanges => {
    versionChanges.forEach(change => {
      allPaths.add(change.path.join('.'));
    });
  });

  // For each path with changes
  for (const path of allPaths) {
    const pathArr = path.split('.');
    const versionsWithChanges = Object.entries(changes)
      .filter(([_, vChanges]) => 
        vChanges.some(change => change.path.join('.') === path)
      )
      .map(([version, vChanges]) => ({
        version: parseInt(version),
        change: vChanges.find(change => change.path.join('.') === path)!
      }))
      .sort((a, b) => b.version - a.version);

    // Take the most recent change for this path
    if (versionsWithChanges.length > 0) {
      const mostRecent = versionsWithChanges[0].change;
      let current = resolvedState;
      for (let i = 0; i < pathArr.length - 1; i++) {
        current = current[pathArr[i]];
      }
      current[pathArr[pathArr.length - 1]] = mostRecent.value;
    }
  }

  return resolvedState;
}