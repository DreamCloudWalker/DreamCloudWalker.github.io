## 法线贴图
&emsp; 不管是电影，还是游戏，或是其他工业级别的3D项目，都是一个效果和性能相互权衡的结果。如何在当前配置的设备上，用有限的显卡性能渲染尽可能好的3D效果，始终是图形学工程师所追求的结果。而顶点数/面数是对3D程序影响最直观的一个因素，早在大学玩3dsmax的时候，选修课的老师就告诉我们要控制做的3D模型的面数。自己也尝试过，把一个正方形面片做个1000份的细分，虽然最终渲染出来的效果没有任何变化，在当时的电脑（记得显卡好像是ATI3650）上就有了明显的卡顿。注重实时性的游戏更加不能忍受这种情况。因此我们需要一些东西，在有限的面上面来伪造出更多面片的效果。

&emsp;大家在玩一些3D游戏的时候，如果电脑性能不够，在切换一个新场景的时候，会有明显的先会加载出一个物体的轮廓，然后再逐步显示物体的细节。这当中可能不只是加载和处理法线贴图，也可能是在做分形着色器的处理（见下一章）。

&emsp;未完待续，本来想做完法线贴图的Demo再写。想到了一些就先写出来。