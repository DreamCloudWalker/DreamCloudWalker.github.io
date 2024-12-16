## 轴角（Axis-Angle）
 - 轴角表示使用一个单位向量（代表旋转轴）和一个旋转角度（标量）来描述旋转。即[x,y,z,theta]，前面的xyz表示这个矢量，最后一个表示角度。它在数学上更加直观，但在实现上可能比其他方法更复杂。
 - 轴角表示法可以通过 Rodrigues’ 旋转公式转换成旋转矩阵。

缺点有两个：
 - 1.不同的轴角之间不能进行简单的插值来做动画。
 - 2.不好基于一个矢量加上一个轴角形式的旋转来进行运算。
