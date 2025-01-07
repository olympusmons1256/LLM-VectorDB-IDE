// Function to create a valid initialization vector for namespace creation
function createInitializationVector(dimension: number = 1536): number[] {
    // Create a vector with mostly zeros but some non-zero values
    // to satisfy Pinecone's requirement
    const vector = new Array(dimension).fill(0);
    
    // Add some small non-zero values at regular intervals
    // This ensures the vector is valid while maintaining mostly zero state
    for (let i = 0; i < dimension; i += 100) {
      vector[i] = 0.0001;
    }
    
    return vector;
  }
  
  // Updated namespace initialization code
  async function initializeNamespace(
    index: any,
    namespace: string,
    timestamp: string = new Date().toISOString()
  ): Promise<void> {
    const initVector = createInitializationVector();
    
    const testVector = {
      id: `${namespace}-init`,
      values: initVector,
      metadata: {
        initialized: true,
        timestamp: timestamp
      }
    };
  
    await index.namespace(namespace).upsert([testVector]);
  }
  
  export { createInitializationVector, initializeNamespace };