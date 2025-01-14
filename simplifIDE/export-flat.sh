#!/bin/bash

# Create export directory
mkdir -p exported

# Find all files except those in node_modules and package-lock.json
find . -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/.next/*" \
    ! -name "package-lock.json" \
    ! -name "export-flat.sh" \
    -print0 | while IFS= read -r -d '' file; do
    
    # Create new filename
    newname=$(echo "$file" | sed 's/^\.\///' | sed 's/\//-/g')
    
    # Copy file
    cp "$file" "exported/$newname"
    echo "Copied: $file -> exported/$newname"
done

echo "Files exported to: $(pwd)/exported"