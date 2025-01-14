// src/components/Settings/constants.ts
export const CLOUD_OPTIONS = [
    { value: 'aws', label: 'AWS' },
    { value: 'gcp', label: 'Google Cloud' },
    { value: 'azure', label: 'Azure' }
  ] as const;
  
  export const REGION_OPTIONS = {
    aws: [
      { value: 'us-east-1', label: 'US East (N. Virginia)' },
      { value: 'us-west-2', label: 'US West (Oregon)' },
      { value: 'eu-west-1', label: 'Europe (Ireland)' },
      { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' }
    ],
    gcp: [
      { value: 'us-central1', label: 'US Central (Iowa)' },
      { value: 'us-east1', label: 'US East (South Carolina)' },
      { value: 'europe-west1', label: 'Europe West (Belgium)' },
      { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' }
    ],
    azure: [
      { value: 'eastus', label: 'East US' },
      { value: 'westus2', label: 'West US 2' },
      { value: 'northeurope', label: 'North Europe' },
      { value: 'southeastasia', label: 'Southeast Asia' }
    ]
  } as const;