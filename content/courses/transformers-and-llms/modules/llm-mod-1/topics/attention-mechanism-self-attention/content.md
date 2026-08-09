Before Transformers, recurrent neural networks (RNNs and LSTMs) processed tokens sequentially. This created an information bottleneck over long contexts and prevented efficient hardware parallelization.

## 1. The Query, Key, Value Metaphor

In self-attention, each input token vector is projected into three distinct spaces via learned weight matrices:

- **Query (Q)**: What the current token is searching for.
- **Key (K)**: What features or content this token offers to others.
- **Value (V)**: The actual semantic payload to pass along if a match occurs.

## 2. The Scaled Dot-Product Attention Formula

:::math The core attention equation with optional causal mask M
\text{Attention}(Q, K, V) = \text{softmax}\left( \frac{Q K^T}{\sqrt{d_k}} + M \right) V
:::

:::tip Why Scale by √d_k?
When vector dimension d_k is large, the dot product values grow in magnitude, pushing the softmax function into regions with near-zero gradients. Dividing by √d_k stabilizes variance to 1.0!
:::

## 3. PyTorch Multi-Head Self-Attention Implementation

```python
import torch
import torch.nn as nn
import math

class CausalSelfAttention(nn.Module):
    def __init__(self, d_model: int, n_heads: int, max_seq_len: int = 2048):
        super().__init__()
        assert d_model % n_heads == 0
        self.d_model = d_model
        self.n_heads = n_heads
        self.head_dim = d_model // n_heads
        
        # Combined Q, K, V projection
        self.qkv_proj = nn.Linear(d_model, 3 * d_model)
        self.out_proj = nn.Linear(d_model, d_model)
        
        # Causal mask buffer
        mask = torch.tril(torch.ones(max_seq_len, max_seq_len)).view(1, 1, max_seq_len, max_seq_len)
        self.register_buffer("mask", mask)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape  # Batch, Sequence Length, Embedding Dim
        
        # 1. Project and split into Q, K, V
        qkv = self.qkv_proj(x)  # [B, T, 3*C]
        q, k, v = qkv.chunk(3, dim=-1)
        
        # 2. Reshape into multi-head format: [B, n_heads, T, head_dim]
        q = q.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        
        # 3. Scaled dot-product scores
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        
        # 4. Apply causal mask (set upper triangle to -inf)
        scores = scores.masked_fill(self.mask[:, :, :T, :T] == 0, float('-inf'))
        
        # 5. Softmax attention weights
        attn_weights = torch.softmax(scores, dim=-1)
        
        # 6. Aggregate values & project back
        out = (attn_weights @ v).transpose(1, 2).contiguous().view(B, T, C)
        return self.out_proj(out)
```

:::key_takeaways Key takeaways
- Attention allows every token to route information directly to every other token in O(1) step distance.
- Causal masking is critical for autoregressive generation so future tokens cannot leak into past predictions.
- Multi-head attention allows the model to attend to information from different representation subspaces simultaneously.
:::
