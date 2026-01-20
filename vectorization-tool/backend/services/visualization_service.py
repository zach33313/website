"""Visualization service for dimensionality reduction and similarity."""

from typing import List, Dict, Any, Optional, Literal
import numpy as np


class VisualizationService:
    """Service for embedding visualization."""

    def reduce_dimensions(
        self,
        embeddings: List[List[float]],
        algorithm: Literal["umap", "tsne", "pca"] = "umap",
        n_components: int = 2,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Reduce embedding dimensions for visualization.

        Args:
            embeddings: List of embedding vectors
            algorithm: Reduction algorithm (umap, tsne, pca)
            n_components: Target dimensions (2 or 3)
            **kwargs: Algorithm-specific parameters

        Returns:
            Dict with reduced coordinates and metadata
        """
        if not embeddings:
            return {"coordinates": [], "algorithm": algorithm, "dimensions": n_components}

        X = np.array(embeddings)

        if algorithm == "umap":
            coords = self._reduce_umap(X, n_components, **kwargs)
        elif algorithm == "tsne":
            coords = self._reduce_tsne(X, n_components, **kwargs)
        elif algorithm == "pca":
            coords = self._reduce_pca(X, n_components, **kwargs)
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        # Normalize coordinates to [-1, 1] range for better visualization
        coords = self._normalize_coordinates(coords)

        return {
            "coordinates": coords.tolist(),
            "algorithm": algorithm,
            "dimensions": n_components,
            "point_count": len(coords)
        }

    def _normalize_coordinates(self, coords: np.ndarray) -> np.ndarray:
        """Normalize coordinates to [-1, 1] range for each dimension."""
        if len(coords) == 0:
            return coords

        # Normalize each dimension independently
        normalized = np.zeros_like(coords)
        for i in range(coords.shape[1]):
            col = coords[:, i]
            col_min, col_max = col.min(), col.max()
            if col_max - col_min > 1e-10:  # Avoid division by zero
                normalized[:, i] = 2 * (col - col_min) / (col_max - col_min) - 1
            else:
                normalized[:, i] = 0  # All values are the same

        return normalized

    def _reduce_umap(
        self,
        X: np.ndarray,
        n_components: int,
        n_neighbors: int = 15,
        min_dist: float = 0.1,
        metric: str = "cosine",
        **kwargs
    ) -> np.ndarray:
        """UMAP dimensionality reduction."""
        n_samples = len(X)

        # For very small datasets, fall back to PCA
        if n_samples < 4:
            return self._reduce_pca(X, n_components)

        import umap

        # Adjust n_neighbors - must be less than n_samples
        n_neighbors = min(n_neighbors, n_samples - 1)
        if n_neighbors < 2:
            n_neighbors = 2

        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=min_dist,
            metric=metric,
            random_state=42
        )

        return reducer.fit_transform(X)

    def _reduce_tsne(
        self,
        X: np.ndarray,
        n_components: int,
        perplexity: float = 30.0,
        learning_rate: float = 200.0,
        n_iter: int = 1000,
        **kwargs
    ) -> np.ndarray:
        """t-SNE dimensionality reduction."""
        n_samples = len(X)

        # For very small datasets, fall back to PCA
        if n_samples < 4:
            return self._reduce_pca(X, n_components)

        from sklearn.manifold import TSNE

        # Adjust perplexity for small datasets (must be < n_samples)
        perplexity = min(perplexity, max(1, n_samples - 1))
        if perplexity < 1:
            perplexity = 1

        reducer = TSNE(
            n_components=n_components,
            perplexity=perplexity,
            learning_rate=learning_rate,
            n_iter=n_iter,
            random_state=42
        )

        return reducer.fit_transform(X)

    def _reduce_pca(
        self,
        X: np.ndarray,
        n_components: int,
        **kwargs
    ) -> np.ndarray:
        """PCA dimensionality reduction."""
        from sklearn.decomposition import PCA

        # Ensure n_components doesn't exceed dimensions or samples
        n_components = min(n_components, X.shape[0], X.shape[1])

        reducer = PCA(n_components=n_components, random_state=42)
        return reducer.fit_transform(X)

    def calculate_similarity_matrix(
        self,
        embeddings: List[List[float]],
        metric: str = "cosine"
    ) -> Dict[str, Any]:
        """
        Calculate pairwise similarity matrix.

        Args:
            embeddings: List of embedding vectors
            metric: Similarity metric (cosine, euclidean, dot)

        Returns:
            Dict with similarity matrix and metadata
        """
        if not embeddings:
            return {"matrix": [], "metric": metric, "size": 0}

        X = np.array(embeddings)

        if metric == "cosine":
            # Normalize for cosine similarity
            norms = np.linalg.norm(X, axis=1, keepdims=True)
            X_normalized = X / np.maximum(norms, 1e-10)
            matrix = np.dot(X_normalized, X_normalized.T)
        elif metric == "euclidean":
            from sklearn.metrics import pairwise_distances
            distances = pairwise_distances(X, metric="euclidean")
            # Convert to similarity (inverse of distance)
            matrix = 1 / (1 + distances)
        elif metric == "dot":
            matrix = np.dot(X, X.T)
        else:
            raise ValueError(f"Unknown metric: {metric}")

        return {
            "matrix": matrix.tolist(),
            "metric": metric,
            "size": len(matrix),
            "min": float(matrix.min()),
            "max": float(matrix.max()),
            "mean": float(matrix.mean())
        }

    def find_nearest_neighbors(
        self,
        embeddings: List[List[float]],
        query_index: int,
        k: int = 5,
        metric: str = "cosine"
    ) -> List[Dict[str, Any]]:
        """
        Find k nearest neighbors for a given embedding.

        Args:
            embeddings: List of embedding vectors
            query_index: Index of the query embedding
            k: Number of neighbors to find
            metric: Similarity metric

        Returns:
            List of neighbor dicts with index and similarity
        """
        if not embeddings or query_index >= len(embeddings):
            return []

        X = np.array(embeddings)
        query = X[query_index]

        if metric == "cosine":
            # Cosine similarity
            norms = np.linalg.norm(X, axis=1)
            query_norm = np.linalg.norm(query)
            similarities = np.dot(X, query) / (norms * query_norm + 1e-10)
        elif metric == "euclidean":
            distances = np.linalg.norm(X - query, axis=1)
            similarities = 1 / (1 + distances)
        else:
            similarities = np.dot(X, query)

        # Get top k+1 (including self) and exclude self
        top_indices = np.argsort(similarities)[::-1][:k+1]

        neighbors = []
        for idx in top_indices:
            if idx != query_index:
                neighbors.append({
                    "chunk_id": f"chunk_{idx}",
                    "chunk_index": int(idx),
                    "index": int(idx),  # Keep for backwards compatibility
                    "similarity": float(similarities[idx]),
                    "preview": ""  # Placeholder - will be filled by frontend
                })

        return neighbors[:k]

    def detect_clusters(
        self,
        embeddings: List[List[float]],
        algorithm: str = "kmeans",
        n_clusters: int = 5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Detect clusters in embeddings.

        Args:
            embeddings: List of embedding vectors
            algorithm: Clustering algorithm (kmeans, dbscan)
            n_clusters: Number of clusters (for kmeans)

        Returns:
            Dict with cluster labels and metadata
        """
        if not embeddings:
            return {"labels": [], "n_clusters": 0}

        X = np.array(embeddings)

        if algorithm == "kmeans":
            from sklearn.cluster import KMeans

            # Adjust n_clusters if needed
            n_clusters = min(n_clusters, len(X))

            clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = clusterer.fit_predict(X)
            centers = clusterer.cluster_centers_.tolist()
        elif algorithm == "dbscan":
            from sklearn.cluster import DBSCAN

            eps = kwargs.get("eps", 0.5)
            min_samples = kwargs.get("min_samples", 5)

            clusterer = DBSCAN(eps=eps, min_samples=min_samples)
            labels = clusterer.fit_predict(X)
            centers = None
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")

        return {
            "labels": labels.tolist(),
            "n_clusters": len(set(labels)) - (1 if -1 in labels else 0),
            "cluster_sizes": {int(l): int((labels == l).sum()) for l in set(labels)},
            "centers": centers
        }

    def find_duplicates(
        self,
        embeddings: List[List[float]],
        threshold: float = 0.95
    ) -> List[Dict[str, Any]]:
        """
        Find near-duplicate embeddings.

        Args:
            embeddings: List of embedding vectors
            threshold: Similarity threshold for duplicates

        Returns:
            List of duplicate pairs
        """
        if len(embeddings) < 2:
            return []

        similarity_result = self.calculate_similarity_matrix(embeddings)
        matrix = np.array(similarity_result["matrix"])

        duplicates = []
        seen_pairs = set()

        for i in range(len(matrix)):
            for j in range(i + 1, len(matrix)):
                if matrix[i, j] >= threshold:
                    pair = (min(i, j), max(i, j))
                    if pair not in seen_pairs:
                        seen_pairs.add(pair)
                        duplicates.append({
                            "index_a": i,
                            "index_b": j,
                            "similarity": float(matrix[i, j])
                        })

        # Sort by similarity descending
        duplicates.sort(key=lambda x: x["similarity"], reverse=True)

        return duplicates
