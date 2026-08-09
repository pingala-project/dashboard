In modern AI, everything—whether a sentence, an audio clip, or an image patch—is embedded into an n-dimensional vector space. To understand how models compare concepts, we must first master the geometry of vectors.

## 1. What is an Embedding Vector?

A vector $\mathbf{v} \in \mathbb{R}^d$ is an ordered list of $d$ real numbers representing coordinates in a continuous semantic space. When an LLM processes the word "King", it maps it to a point in e.g. 4096-dimensional space.

:::tip Pingala Intuition Note
Just as Pingala used binary sequences (Laghu and Guru) to map meter rhythms, modern AI uses high-dimensional numerical coordinates to map human thoughts and knowledge.
:::

## 2. The Dot Product & Geometric Angle

The algebraic dot product between two vectors $\mathbf{u}$ and $\mathbf{v}$ is the sum of their element-wise products:

:::math Geometric and Algebraic definition of the Dot Product
\mathbf{u} \cdot \mathbf{v} = \sum_{i=1}^d u_i v_i = \|\mathbf{u}\| \|\mathbf{v}\| \cos(\theta)
:::

Rearranging this formula gives us the widely used **Cosine Similarity**, which measures the directional alignment between two vectors independently of their magnitude:

:::math Cosine Similarity formula used in embeddings & search
\text{Cosine Similarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2} = \frac{\sum u_i v_i}{\sqrt{\sum u_i^2} \sqrt{\sum v_i^2}}
:::

## 3. Vectorized NumPy Implementation

```python
import numpy as np

def cosine_similarity(u: np.ndarray, v: np.ndarray) -> float:
    """Computes cosine similarity between two 1D vectors."""
    dot_product = np.dot(u, v)
    norm_u = np.linalg.norm(u)
    norm_v = np.linalg.norm(v)
    return dot_product / (norm_u * norm_v + 1e-9)

# Example: Semantic embeddings
king = np.array([0.9, 0.2, 0.85])
queen = np.array([0.88, 0.25, 0.82])
apple = np.array([0.1, 0.95, 0.05])

print(f"Sim(King, Queen): {cosine_similarity(king, queen):.4f}")
print(f"Sim(King, Apple): {cosine_similarity(king, apple):.4f}")
```

:::key_takeaways Key takeaways
- Vectors represent points and directions in high-dimensional feature spaces.
- The dot product computes projection magnitude and directional alignment.
- Cosine similarity normalizes vectors to unit length, making it invariant to vector scale.
:::
