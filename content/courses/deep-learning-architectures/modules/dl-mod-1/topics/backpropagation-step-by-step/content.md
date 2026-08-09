Backpropagation is simply the multivariate Chain Rule applied recursively across a directed acyclic computation graph (DAG).

## The Chain Rule in Computation Graphs

:::math Upstream gradient times local Jacobian
\frac{\partial \mathcal{L}}{\partial x} = \sum_{j} \frac{\partial \mathcal{L}}{\partial y_j} \frac{\partial y_j}{\partial x}
:::
