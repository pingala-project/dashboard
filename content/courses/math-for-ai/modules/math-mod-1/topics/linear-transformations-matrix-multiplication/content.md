Every dense layer in a neural network ($y = Wx + b$) is fundamentally a linear transformation followed by an activation. Understanding what $W$ physically does to space is essential.

## Matrices as Coordinate Transformations

The columns of a matrix $A$ tell you where the standard basis vectors $\hat{i}$ and $\hat{j}$ land after transformation. When we multiply $A \mathbf{x}$, we are taking a linear combination of those transformed basis columns.

:::math Column picture of matrix multiplication
A \mathbf{x} = \begin{bmatrix} a & b \\ c & d \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} = x_1 \begin{bmatrix} a \\ c \end{bmatrix} + x_2 \begin{bmatrix} b \\ d \end{bmatrix}
:::
