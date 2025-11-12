// 引入three.js
import * as THREE from "three";
// 导入附加组件-轨道控制器
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// 引入CSS3渲染器CSS3DRenderer
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import * as TWEEN from "three/examples/jsm/libs/tween.module";

// import Stats from "three/addons/libs/stats.module";

export let scene,
  camera,
  renderer,
  controls,
  css3DRenderer,
  width,
  height,
  stats,
  axesHelper;

export const destoryThreejs = () => {
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.context = null;
  renderer = null;
  camera = null;
  scene.traverse((item) => {
    if (item.material) {
      item.material.dispose();
    }
    if (item.geometry) {
      item.geometry.dispose();
    }
    item = null;
  });
  scene = null;
};
// 测试工具
export const addTestTool = () => {
  // 添加坐标轴 方便调试
  // axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);
  // 添加性能监控
  // stats = new Stats();
  // document.body.appendChild(stats.dom);
};
// 初始化三要素
export function init(dom) {
  // 初始化场景
  scene = new THREE.Scene();
  addTestTool();

  // 初始化相机并移动相机位置
  camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 10000);
  // 默认模型位置
  camera.position.set(0, 120, 180);

  // 初始化渲染器并添加抗锯齿效果
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    canvas: document.getElementById("canvas"),
    alpha: true,
    antialias: true,
  });
  // 给画布设置宽高
  renderer.setSize(width, height);
}

// 创建轨道控制器
export function createControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  // 开启阻尼惯性
  controls.enableDamping = true;
  // 阻尼速度
  controls.dampingFactor = 0.1;
}

// 初始化灯光
export function initLight() {
  //模拟远处类似太阳的光源
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1000);
  directionalLight.position.set(0, 0, 0);
  //开启阴影
  directionalLight.castShadow = true;
  // 阴影相机范围;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  directionalLight.shadow.camera.left = -100;
  directionalLight.shadow.camera.right = 100;
  //阴影影相机远近
  directionalLight.shadow.camera.near = 1;
  directionalLight.shadow.camera.far = 200;
  //阴影贴图大小
  directionalLight.shadow.mapSize.set(1024, 1024);
  scene.add(directionalLight);

  //影响整个场景的光源
  const ambientLight = new THREE.AmbientLight(0x7aaed7, 20);
  ambientLight.position.set(0, 100, 50);
  scene.add(ambientLight);
}

// 4.创建CSS3D渲染器
export const createCSS3DRenderer = (dom) => {
  // 创建一个CSS3渲染器CSS3DRenderer
  css3DRenderer = new CSS3DRenderer();
  css3DRenderer.setSize(180, 200);

  // HTML标签<div id="dialog"></div>外面父元素叠加到canvas画布上且重合
  css3DRenderer.domElement.style.position = "absolute";
  css3DRenderer.domElement.style.top = "0";
  //设置.pointerEvents=none，解决HTML元素标签对threejs canvas画布鼠标事件的遮挡
  css3DRenderer.domElement.style.pointerEvents = "none";
  dom.appendChild(css3DRenderer.domElement);
  controls.update();
};

// 5.1监测div的尺寸变化(是否大屏/全屏)
export const watchDom = (dom) => {
  let ro = new ResizeObserver(() => {
    updateRelatedProperties(dom);
  });
  ro.observe(dom);
};

// 5.2监听浏览器窗口的缩放
export function renderResize(dom) {
  window.addEventListener("resize", () => {
    updateRelatedProperties(dom);
  });
}
// 6.循环渲染
export function renderLoop() {
  if (!renderer) return;
  requestAnimationFrame(renderLoop);
  // 实时更新性能
  TWEEN.update();
  controls.update();
  css3DRenderer.render(scene, camera);
  renderer.render(scene, camera);
  // stats.update();
}

// 相机移动动画
const createCameraTween = (endPos, endTarget) => {
  new TWEEN.Tween({
    // 不管相机此刻处于什么状态，直接读取当前的位置和目标观察点
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  })
    .to(
      {
        // 动画结束相机位置坐标
        x: endPos.x,
        y: endPos.y,
        z: endPos.z,
        // 动画结束相机指向的目标观察点
        tx: endTarget.x,
        ty: endTarget.y,
        tz: endTarget.z,
      },
      2000
    )
    .onUpdate(function (obj) {
      // 动态改变相机位置
      camera.position.set(obj.x, obj.y, obj.z);
      // 动态计算相机视线
      controls.target.set(obj.tx, obj.ty, obj.tz);
      controls.update(); //内部会执行.lookAt()
    })
    .start();
};
// 将相机移动重置到指定位置
export const resetCamera = () => {
  const cameraPos = new THREE.Vector3(0, 120, 180);
  const target = new THREE.Vector3(0, 0, 0);
  createCameraTween(cameraPos, target);
};

// --------------------------公共函数-------------------------------
export const getDomInfo = (dom) => {
  width = dom.offsetWidth;
  height = dom.offsetHeight;
};

function updateRelatedProperties(dom) {
  getDomInfo(dom);
  // 更新画布宽高
  renderer.setSize(width, height);
  // 更新相机的宽高比
  camera.aspect = width / height;
  // 更新相机的近截面和远截面
  camera.updateProjectionMatrix();
  // HTML标签css3Renderer.domElement尺寸重新设置
  css3DRenderer.setSize(width, height);
}
