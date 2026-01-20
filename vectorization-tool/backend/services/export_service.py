"""Export service for various vector database formats."""

from typing import List, Dict, Any, Optional
import json


def _get_chunk_text(chunk: Dict[str, Any]) -> str:
    """Get text from chunk, supporting both 'text' and 'content' keys."""
    return chunk.get("text") or chunk.get("content", "")


class ExportService:
    """Service for exporting chunks and embeddings to various formats."""

    def export_chromadb(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        collection_name: str = "documents"
    ) -> Dict[str, Any]:
        """
        Export to ChromaDB format with Python code.

        Args:
            chunks: List of chunk dicts
            embeddings: List of embedding vectors
            collection_name: Name for the collection

        Returns:
            Dict with code and data
        """
        ids = [chunk.get("id", f"chunk_{i}") for i, chunk in enumerate(chunks)]
        documents = [_get_chunk_text(chunk) for chunk in chunks]

        code = f'''import chromadb

# Initialize client
client = chromadb.Client()  # or chromadb.PersistentClient(path="./chroma_db")

# Create or get collection
collection = client.get_or_create_collection(
    name="{collection_name}",
    metadata={{"hnsw:space": "cosine"}}
)

# Data to insert
ids = {json.dumps(ids[:3])}  # ... {len(ids)} total
documents = {json.dumps(documents[:1])}  # ... {len(documents)} total
embeddings = [...]  # {len(embeddings)} vectors of {len(embeddings[0]) if embeddings else 0} dimensions

# Insert into collection
collection.add(
    ids=ids,
    documents=documents,
    embeddings=embeddings,
    metadatas=[{{"chunk_index": i}} for i in range(len(ids))]
)

# Query example
results = collection.query(
    query_embeddings=[embeddings[0]],
    n_results=5
)
print(results)
'''

        return {
            "code": code,
            "data": {
                "collection_name": collection_name,
                "ids": ids,
                "embeddings": embeddings,
                "documents": documents,
            }
        }

    def export_pinecone(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        namespace: str = "default"
    ) -> Dict[str, Any]:
        """
        Export to Pinecone format with Python code.

        Args:
            chunks: List of chunk dicts
            embeddings: List of embedding vectors
            namespace: Pinecone namespace

        Returns:
            Dict with code and data
        """
        vectors = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            text = _get_chunk_text(chunk)
            vectors.append({
                "id": chunk.get("id", f"chunk_{i}"),
                "values": embedding,
                "metadata": {
                    "text": text[:1000],  # Pinecone metadata limit
                    "chunk_index": i,
                }
            })

        dimensions = len(embeddings[0]) if embeddings else 0

        code = f'''from pinecone import Pinecone, ServerlessSpec

# Initialize Pinecone
pc = Pinecone(api_key="YOUR_PINECONE_API_KEY")

# Create index if it doesn't exist
index_name = "my-index"
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension={dimensions},
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1")
    )

# Get index
index = pc.Index(index_name)

# Prepare vectors
vectors = [
    {{
        "id": "chunk_0",
        "values": [...],  # {dimensions}-dimensional vector
        "metadata": {{"text": "...", "chunk_index": 0}}
    }},
    # ... {len(vectors)} total vectors
]

# Upsert in batches
batch_size = 100
for i in range(0, len(vectors), batch_size):
    batch = vectors[i:i+batch_size]
    index.upsert(vectors=batch, namespace="{namespace}")

# Query example
results = index.query(
    vector=vectors[0]["values"],
    top_k=5,
    namespace="{namespace}",
    include_metadata=True
)
print(results)
'''

        return {
            "code": code,
            "data": {
                "namespace": namespace,
                "vectors": vectors
            }
        }

    def export_qdrant(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        collection_name: str = "documents"
    ) -> Dict[str, Any]:
        """
        Export to Qdrant format with Python code.

        Args:
            chunks: List of chunk dicts
            embeddings: List of embedding vectors
            collection_name: Name for the collection

        Returns:
            Dict with code and data
        """
        points = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            text = _get_chunk_text(chunk)
            points.append({
                "id": i,
                "vector": embedding,
                "payload": {
                    "text": text,
                    "chunk_index": i,
                }
            })

        dimensions = len(embeddings[0]) if embeddings else 0

        code = f'''from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Initialize client
client = QdrantClient(host="localhost", port=6333)
# or QdrantClient(url="https://your-cluster.qdrant.io", api_key="YOUR_API_KEY")

# Create collection
client.recreate_collection(
    collection_name="{collection_name}",
    vectors_config=VectorParams(
        size={dimensions},
        distance=Distance.COSINE
    )
)

# Prepare points
points = [
    PointStruct(
        id=0,
        vector=[...],  # {dimensions}-dimensional vector
        payload={{"text": "...", "chunk_index": 0}}
    ),
    # ... {len(points)} total points
]

# Upsert points
client.upsert(
    collection_name="{collection_name}",
    points=points
)

# Query example
results = client.search(
    collection_name="{collection_name}",
    query_vector=points[0].vector,
    limit=5
)
print(results)
'''

        return {
            "code": code,
            "data": {
                "collection_name": collection_name,
                "points": points
            }
        }

    def export_json(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        config: Optional[Dict[str, Any]] = None,
        include_embeddings: bool = True
    ) -> Dict[str, Any]:
        """
        Export to generic JSON format.

        Args:
            chunks: List of chunk dicts
            embeddings: List of embedding vectors
            config: Optional chunking/embedding configuration
            include_embeddings: Whether to include embeddings in export

        Returns:
            Generic JSON export
        """
        export_data = {
            "version": "1.0",
            "config": config or {},
            "statistics": {
                "total_chunks": len(chunks),
                "avg_token_count": sum(c.get("token_count", 0) for c in chunks) / max(len(chunks), 1),
                "embedding_dimensions": len(embeddings[0]) if embeddings else 0
            },
            "chunks": []
        }

        for i, chunk in enumerate(chunks):
            text = _get_chunk_text(chunk)
            metadata = chunk.get("metadata", {})
            chunk_export = {
                "id": chunk.get("id", f"chunk_{i}"),
                "index": metadata.get("chunk_index", i),
                "text": text,
                "metadata": {
                    "source": metadata.get("source", "unknown"),
                    "char_start": metadata.get("start_char", 0),
                    "char_end": metadata.get("end_char", 0),
                    "char_count": metadata.get("char_count", len(text)),
                    "token_count": metadata.get("token_count", 0),
                    "word_count": metadata.get("word_count", len(text.split()))
                }
            }

            if include_embeddings and i < len(embeddings):
                chunk_export["embedding"] = embeddings[i]

            export_data["chunks"].append(chunk_export)

        return export_data

    def export_csv(
        self,
        chunks: List[Dict[str, Any]],
        include_text: bool = True
    ) -> str:
        """
        Export to CSV format (without embeddings).

        Args:
            chunks: List of chunk dicts
            include_text: Whether to include full text

        Returns:
            CSV string
        """
        import csv
        import io

        output = io.StringIO()

        fieldnames = ["id", "index", "source", "char_start", "char_end",
                      "char_count", "token_count", "word_count"]
        if include_text:
            fieldnames.append("text")

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for i, chunk in enumerate(chunks):
            text = _get_chunk_text(chunk)
            metadata = chunk.get("metadata", {})
            row = {
                "id": chunk.get("id", f"chunk_{i}"),
                "index": metadata.get("chunk_index", i),
                "source": metadata.get("source", "unknown"),
                "char_start": metadata.get("start_char", 0),
                "char_end": metadata.get("end_char", 0),
                "char_count": metadata.get("char_count", len(text)),
                "token_count": metadata.get("token_count", 0),
                "word_count": metadata.get("word_count", len(text.split()))
            }

            if include_text:
                # Escape and truncate text for CSV
                row["text"] = text.replace("\n", "\\n")[:500]

            writer.writerow(row)

        return output.getvalue()

    def export_config(
        self,
        chunking_config: Dict[str, Any],
        embedding_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Export configuration for reproducibility.

        Args:
            chunking_config: Chunking configuration
            embedding_config: Embedding configuration

        Returns:
            Configuration dict
        """
        return {
            "version": "1.0",
            "chunking": {
                "strategy": chunking_config.get("strategy", "recursive"),
                "chunk_size": chunking_config.get("chunk_size", 450),
                "chunk_overlap": chunking_config.get("chunk_overlap", 90),
                "size_metric": chunking_config.get("size_metric", "tokens"),
                "separators": chunking_config.get("separators", None),
                "keep_separator": chunking_config.get("keep_separator", False)
            },
            "embedding": {
                "model": embedding_config.get("model", "sentence-transformers/all-MiniLM-L6-v2"),
                "dimensions": embedding_config.get("dimensions", None),
                "normalize": embedding_config.get("normalize", True),
                "batch_size": embedding_config.get("batch_size", 32)
            }
        }
