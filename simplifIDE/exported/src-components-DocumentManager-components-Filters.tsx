// src/components/DocumentManager/components/Filters.tsx
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Folder, Code, FileText, FileArchive } from "lucide-react"
import { DocumentType } from "../types"

interface TypeFilterProps {
  selectedType?: string;
  onTypeSelect: (type: DocumentType | undefined) => void;
}

const TypeFilter = ({
  selectedType,
  onTypeSelect
}: TypeFilterProps) => {
  const types = [
    { 
      type: 'project-structure' as DocumentType, 
      label: 'Project',
      icon: <Folder className="w-4 h-4" />
    },
    { 
      type: 'core-architecture' as DocumentType, 
      label: 'Architecture',
      icon: <FileArchive className="w-4 h-4" />
    },
    { 
      type: 'code' as DocumentType, 
      label: 'Code',
      icon: <Code className="w-4 h-4" />
    },
    { 
      type: 'documentation' as DocumentType, 
      label: 'Docs',
      icon: <FileText className="w-4 h-4" />
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {types.map(({ type, label, icon }) => (
        <Button
          key={type}
          variant={selectedType === type ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeSelect(selectedType === type ? undefined : type)}
          className="flex items-center gap-2"
        >
          {icon}
          {label}
        </Button>
      ))}
    </div>
  );
}
TypeFilter.displayName = "TypeFilter"

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

const SearchBar = ({
  value,
  onChange,
  onSearch
}: SearchBarProps) => {
  return (
    <div className="flex items-center space-x-2 flex-1">
      <Input
        placeholder="Search documents..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSearch();
          }
        }}
        className="flex-1"
      />
      <Button
        variant="outline"
        onClick={onSearch}
        disabled={!value.trim()}
      >
        <Search className="w-4 h-4" />
      </Button>
    </div>
  );
}
SearchBar.displayName = "SearchBar"

export { TypeFilter, SearchBar }