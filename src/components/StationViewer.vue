<template>
  <div class="operation-tools">
    <div
      class="operation-item operation-item-reset"
      @click="resetCamera"
    ></div>
    <div
      class="operation-item"
      :class="[isShowAlarm ? 'alarm-show' : 'alarm-hide']"
      @click="showAlarmHandle"
    ></div>
  </div>
  <div class="station-container">
    <!-- <div class="station-logo"></div> -->
    <div class="station-name">{{ stationName }}</div>
  </div>
  <div class="home-container">
    <div class="three-area">
      <div
        class="three-box"
        ref="threeDemoRef"
      >
        <canvas id="canvas"></canvas>
      </div>

      <div
        ref="dialogRef"
        id="myDialog"
        style="display: none"
      ></div>
    </div>
  </div>
</template>
<script setup>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer";

import { ref, onMounted, reactive, onBeforeMount } from "vue";
import { ElLoading } from "element-plus";
import {
  camera,
  scene,
  getDomInfo,
  init,
  createControls,
  controls,
  initLight,
  createCSS3DRenderer,
  watchDom,
  renderResize,
  renderLoop,
  resetCamera,
} from "@/components/utils/init";
import {
  renderAntennaMaterial,
  produceDialogHtml,
  renderMaterial,
} from "@/components/utils/render";

import { getStationAntennaList, getHostList } from "@/api/server";
import { formatAntennaList } from "@/api/utils";

let model;
// 指示牌的底部线集合 便于后续清除
let dialogLineList = [];
let baseCircleList = [];

const dialogRef = ref();
const threeDemoRef = ref();
const isShowAlarm = ref(true);
const fetchDataTimer = ref();
const stationId = ref();
const stationName = ref();
const intervalTime = ref(60);
const loadingInstance = ref();

const openedRings = new Set(); // 记录当前展开了环形的天线名

const state = reactive({
  antennas: [],
  hostList: [],
  positionMap: {},
});
// 水波纹材质
let redWaterRippleMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  side: THREE.DoubleSide,
  opacity: 0.1,
  transparent: true,
});
// 水波纹效果
const addWaterRipples = (x, y, z, containerObj) => {
  let geometry = new THREE.CylinderGeometry(4, 4, 1, 60);
  let materials = [
    redWaterRippleMaterial,
    redWaterRippleMaterial,
    redWaterRippleMaterial,
  ];
  let mesh = new THREE.Mesh(geometry, materials);
  mesh.position.set(x, y, z);
  mesh.rotateX(Math.PI / 2);
  mesh.name = "waterRipples";
  // 设置是否显示隐藏
  mesh.visible = isShowAlarm.value;

  containerObj.add(mesh);

  let s = 0;
  let p = 1;
  function animate() {
    // 一定要在此函数中调用
    s += 0.03;
    p -= 0.005;
    if (s > 2) {
      s = 0;
      p = 1;
    }
    const scaleBase = 200;
    mesh.scale.set((1 + s) * scaleBase, 1, (1 + s) * scaleBase);
    mesh.material[0].opacity = p;

    requestAnimationFrame(animate);
  }

  animate();
};

const addBaseCircle = (position, obj, item, forceError = false) => {
  // forceError 为 true 时必定为红色异常，否则为绿色正常
  const color = forceError ? 0xff0000 : 0x00ff00;
  
  let circleGeometry = new THREE.CircleGeometry(1000, 32);
  let material = new THREE.MeshBasicMaterial({
    color: color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  let circleMesh = new THREE.Mesh(circleGeometry, material);
  // 不做 X 轴旋转，使其直接平放在地面（因为父级模型自带了 -90 度的 X 轴旋转）
  
  // 在这里调整天线底座圆环的中心点偏移量！
  // offsetX 调整左右，offsetZ 调整前后
  let offsetX = item.hostNumber ? 0 : -160; 
  let offsetZ = item.hostNumber ? 0 : -300;
  
  // 局部坐标系中 Z 轴可能代表垂直高度方向
  circleMesh.position.set(position.x + offsetX, position.y, position.z + offsetZ + 10);
  circleMesh.name = "baseCircle_" + item.antName;
  circleMesh.userData = { position, item, obj, offsetX, offsetZ };
  circleMesh.visible = isShowAlarm.value;
  
  // 给 A15 或 A23 常驻展示设备点
  // 只保留一个设备，放到两个天线中间。我们可以只在渲染 A15 的时候生成一个设备，
  // 然后把它偏移到 A15 和 A23 之间的某个位置即可。
  if (item && item.antName === 'A15') {
    // 再次放大尺寸
    let boxGeom = new THREE.BoxGeometry(1000, 1000, 1000);
    // 换成黑色
    let boxMat = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: false
    }); 
    let boxMesh = new THREE.Mesh(boxGeom, boxMat);
    
    // 给设备加个白色粗线框，确保黑色立方体在场景中能被清晰看到
    let edges = new THREE.EdgesGeometry(boxGeom);
    let lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 });
    let lineMesh = new THREE.LineSegments(edges, lineMat);
    boxMesh.add(lineMesh);
    
    // 假设 A15 和 A23 在 X 轴上相隔一定距离，我们把它放在中间的位置
    // 你可以根据实际模型中 A15 和 A23 的距离调整这个 deviceOffsetX
    let deviceOffsetX = -8000; 
    let deviceOffsetY = -2000;
    
    // 放置在距离中心点偏移的位置，再抬高一点Z轴
    boxMesh.position.set(position.x + offsetX + deviceOffsetX, position.y + deviceOffsetY, position.z + offsetZ + 400);
    // 统一命名，便于清理
    boxMesh.name = "baseCircle_shared_device";
    boxMesh.visible = isShowAlarm.value;
    obj.add(boxMesh);
  }
  
  obj.add(circleMesh);
  baseCircleList.push(circleMesh);
};

const createSpreadingRings = (position, obj, offsetX, offsetZ, item) => {
  const dbmValues = ['-50 ~ -65 dBm', '-65 ~ -75 dBm', '-75 ~ -85 dBm'];
  // 红色改成橙色，由原来的 [绿, 黄, 红] 变为 [绿, 黄, 橙]
  const colors = [0x00ff00, 0xffff00, 0xffa500];
  // todo -50 - -65 是绿色 -65 -75 是黄色 -75 -85 是橙色
  for(let i=0; i<3; i++) {
    // 将起始内径从 4000 改为 1000，以衔接底座的 CircleGeometry(1000)
    const innerRadius = 1000 + i * 4000;
    const outerRadius = 1000 + (i + 1) * 4000;
    
    let ringGeom = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    let material = new THREE.MeshBasicMaterial({ 
      color: colors[i], 
      side: THREE.DoubleSide, 
      transparent: true, 
      opacity: 0.6 
    });
    let ringMesh = new THREE.Mesh(ringGeom, material);
    // 同样，Z轴代表垂直高度方向
    ringMesh.position.set(position.x + offsetX, position.y, position.z + offsetZ + 20);
    ringMesh.name = "spreadingRing";
    ringMesh.visible = isShowAlarm.value;
    
    const labelDiv = document.createElement('div');
    labelDiv.textContent = dbmValues[i];
    labelDiv.style.color = '#ffffff';
    labelDiv.style.fontSize = '200px';
    labelDiv.style.fontWeight = 'bold';
    labelDiv.style.pointerEvents = 'none';
    labelDiv.style.textShadow = '0px 0px 4px #000';
    labelDiv.style.textAlign = 'center';
    labelDiv.style.width = '1200px';
    
    // 我们将其添加到 obj 里，所以我们只做相对偏移
    // 强制把元素作为一个整体直接偏移坐标，不再依赖 transform 这种对 ThreeJS 容易失效的属性
    const labelObj = new CSS3DObject(labelDiv);
    
    const labelRadius = innerRadius + (outerRadius - innerRadius) / 2;
    // 我们将 labelRadius 加在水平方向 Y 轴上，使其在平面上向外扩散，Z 轴抬高以防穿模
    labelObj.position.set(position.x + offsetX, position.y + labelRadius, position.z + offsetZ + 30);
    // 不做 X 轴旋转，这样文字正面默认就是朝上的
    labelObj.scale.set(1.5, 1.5, 1.5);
    labelObj.visible = isShowAlarm.value;
    labelObj.name = "spreadingRing";
    
    obj.add(labelObj);
    obj.add(ringMesh);
  }

  // 给A15或A23添加特殊设备弹窗 (基于天线底座弹出)
  if (item && (item.antName === 'A15' || item.antName === 'A23')) {
    // 对应的小弹窗
    const infoDiv = document.createElement('div');
    infoDiv.style.background = 'rgba(0, 0, 0, 0.75)';
    infoDiv.style.border = '4px solid #800080';
    infoDiv.style.color = '#fff';
    infoDiv.style.padding = '40px';
    infoDiv.style.borderRadius = '20px';
    infoDiv.style.fontSize = '100px';
    infoDiv.style.pointerEvents = 'none';
    infoDiv.style.textAlign = 'left';
    infoDiv.style.lineHeight = '1.5';
    infoDiv.style.whiteSpace = 'nowrap';
    
    // 如果是异常天线(比如我们固定的A23)，数值可以不一样用来区分
    let curDbm = item.isCircleError ? "-75 dBm" : "-76 dBm";
    let expectDbm = item.isCircleError ? "-85 dBm" : "-85 dBm";

    infoDiv.innerHTML = `
      <div style="font-size: 140px; margin-bottom: 20px; color: #da70d6; font-weight: bold; border-bottom: 2px solid #da70d6; padding: 20px 30px 40px 30px;">区域信号强度</div>
      <div>当前强度: ${curDbm}</div>
      <div>预期强度: ${expectDbm}</div>
    `;
    
    const infoObj = new CSS3DObject(infoDiv);
    // 弹窗位置放在天线底座中心正上方偏移
    infoObj.position.set(position.x + offsetX, position.y - 1500, position.z + offsetZ + 3000);
    // 为了让文字立起来面对相机，可以适当旋转
    infoObj.rotateX(Math.PI / 2);
    infoObj.scale.set(2.5, 2.5, 2.5);
    infoObj.name = "spreadingRing";
    infoObj.visible = isShowAlarm.value;
    
    obj.add(infoObj);

    function renderInfo() {
      if (!infoObj.parent) return;
      if (camera && controls) {
        const dirx = camera.position.x - controls.target.x;
        const dirz = camera.position.z - controls.target.z;
        const theta = Math.atan2(dirx, dirz);
        infoObj.rotation.y = theta;
      }
      requestAnimationFrame(renderInfo);
    }
    renderInfo();
  }
};

// 获取所有子模型中心点并存储
const getAndStoreModelCenter = (infoList) => {
  model?.traverse((_obj) => {
    if (_obj.isMesh) {
      // 获取模型中心点
      _obj.geometry.computeBoundingBox();
      var centroid = new THREE.Vector3();
      centroid.addVectors(
        _obj.geometry.boundingBox.min,
        _obj.geometry.boundingBox.max
      );
      centroid.multiplyScalar(0.5);
      centroid.applyMatrix4(_obj.matrixWorld);

      state.positionMap[_obj.name] = {
        x: centroid.x,
        y: centroid.y,
        z: centroid.z,
      };
    }
  });
};

// 导入模型
const importModel = () => {
  return new Promise((res, rej) => {
    loadingInstance.value = ElLoading.service({
      text: "正在努力加载模型中....",
      background: "rgba(0, 0, 0, 0)",
    });

    const glbName = `building/${stationId.value}.glb?v=${__APP_VERSION__}`;
    const objLoader = new GLTFLoader();
    objLoader.load(
      glbName,
      (object) => {
        loadingInstance.value?.close();

        model = object.scene;
        // 不同模型用不同材质渲染
        renderMaterial(model, state.antennas);

        // 模型的位置
        getAndStoreModelCenter(state.antennas);

        scene.add(model);

        res("success");
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          // const percentComplete = (xhr.loaded / xhr.total) * 100;
          // console.log("current model load progress: ", percentComplete + "%");
        }
      },
      (error) => {
        loadingInstance.value?.close();

        console.error("Load object model error:", error);
        rej(error);
      }
    );
  });
};
// 清理所有报警信息框 水波纹 信息框底部线
const clearAllAlarmDialogs = () => {
  dialogLineList.map((lineName) => {
    if (scene.getObjectByName(lineName)) {
      scene.remove(scene.getObjectByName(lineName));
    }
  });

  dialogLineList = [];
  baseCircleList = [];

  model?.traverse((_obj) => {
    if (_obj.children.length > 0 && _obj.isMesh) {
      // 移除dialog 和 水波纹
      for (let index = _obj.children.length - 1; index >= 0; index--) {
        const child = _obj.children[index];
        if (
          child.name == "waterRipples" ||
          child.name.indexOf("dialog") >= 0 ||
          child.name.indexOf("baseCircle") >= 0 ||
          child.name == "spreadingRing"
        ) {
          _obj.remove(child);
        }
      }
    }
  });
};

// 创建常亮(报警信息框)
const createAlarmDialog = () => {
  clearAllAlarmDialogs();
  model?.traverse((_obj) => {
    if (_obj.isMesh) {
      state.antennas.forEach((item) => {
        if (item.antName == _obj.name) {
          // 在创建各种告警/信息框之前，如果不是被选中的天线模型则先直接设为透明隐藏
          _obj.visible = true; 
          insertAntennasDialogHtml(_obj, item, state.positionMap[item.antName]);
        }
      });
      // 遍历完成后，如果当前网格不属于我们要显示的天线/主机列表，就把它隐藏
      const isTarget = state.antennas.some(item => item.antName === _obj.name);
      if (!isTarget && _obj.name.startsWith("A")) {
        _obj.visible = false;
      }
    }
  });
};

// 创建指向线的函数
const createPointerLine = (start, end, color, width, dialogCSS3D, item) => {
  // 创建指向线的几何体
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    start.x,
    start.y,
    start.z,
    end.x,
    end.y,
    end.z,
  ]);
  geometry.position = new THREE.BufferAttribute(vertices, 3);
  // 创建指向线的材质
  const material = new THREE.LineBasicMaterial({
    color: "#ff0000", // 指定线的颜色
    linewidth: width, // 设置线的宽度
  });

  // 创建指向线对象
  const line = new THREE.Line(geometry, material);

  // 创建一个 Object3D 用于存放线
  const pointerGroup = new THREE.Object3D();
  pointerGroup.add(line);

  // 计算线的方向向量
  const direction = new THREE.Vector3().copy(end).sub(start).normalize();

  // 计算线头和线尾的位置, 设置圆饼偏移量
  const headPosition = new THREE.Vector3()
    .copy(start)
    .addScaledVector(direction, -5.1);
  const tailPosition = new THREE.Vector3()
    .copy(end)
    .addScaledVector(direction, -0.12);

  // 使用 TextureLoader 加载背景纹理图片
  const backgroundMaterial = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide, // 设置双面可见
    color: item.antStatus == 1 ? 0x1063bd : 0xff4a4a,
  });
  const backgroundGeometry = new THREE.PlaneGeometry(
    0.2,
    tailPosition.distanceTo(headPosition), // 背景的长度，即线段的长度
    1,
    1
  );
  const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
  // 设置背景的位置为线段的中点
  const midpoint = new THREE.Vector3()
    .copy(headPosition)
    .add(tailPosition)
    .multiplyScalar(0.5);

  backgroundMesh.name = Math.floor(Math.random() * 1000) + "_x_line";
  dialogLineList.push(backgroundMesh.name);
  backgroundMesh.position.copy(midpoint); // 设置背景的朝向
  // 设置背景的朝向（垂直方向上朝向相机位置）,计算垂直方向上背景朝向的点，即与相机位置相同高度的点
  const verticalLookAtPoint = new THREE.Vector3(
    camera.position.x,
    backgroundMesh.position.y,
    camera.position.z
  );
  backgroundMesh.lookAt(verticalLookAtPoint);

  // 将线和背景添加到场景中
  function updateOrientation() {
    backgroundMesh.rotation.y = Math.atan2(
      camera.position.x,
      camera.position.z
    );
    // dialogCSS3D.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    if (camera && controls) {
      const dirx = camera.position.x - controls.target.x;
      const dirz = camera.position.z - controls.target.z;
      // 弧度转角度
      const theta = Math.atan2(dirx, dirz);
      dialogCSS3D.rotation.y = theta;
    }
  }
  // 在渲染循环中调用更新函数
  function render() {
    updateOrientation();
    requestAnimationFrame(render);
  }
  render();

  backgroundMesh.visible = isShowAlarm.value;

  scene.add(backgroundMesh);
};

// 插入弹框html
const insertAntennasDialogHtml = (obj, item, position) => {
  // 多个标签-需要克隆复制一份
  const infoDom = dialogRef.value.cloneNode();

  infoDom.innerHTML = produceDialogHtml(item);
  // HTML元素转化为threejs的CSS3对象
  const dialogCSS3D = new CSS3DObject(infoDom);
  //避免标签遮挡canvas鼠标事件
  infoDom.style.pointerEvents = "none";
  dialogCSS3D.name = obj.name + "dialog";

  dialogCSS3D.scale.set(10, 10, 1);

  if (item.hostNumber) {
    dialogCSS3D.scale.set(18, 18, 1);
    dialogCSS3D.position.set(position.x, position.y, position.z + 9000);
  } else {
    if (item.antTypeName === "定向天线") {
      dialogCSS3D.scale.set(18, 18, 1);
      dialogCSS3D.position.set(position.x - 160, position.y, position.z + 8800);
    } else {
      dialogCSS3D.position.set(position.x - 160, position.y, position.z + 4400);
    }
  }

  dialogCSS3D.rotateX(Math.PI / 2);
  dialogCSS3D.visible = isShowAlarm.value;

  obj.add(dialogCSS3D);

  createPointerLine(
    new THREE.Vector3(position.x, position.y + 0.2, position.z),
    new THREE.Vector3(position.x, position.y, position.z),
    0x00ff00,
    100,
    dialogCSS3D,
    item
  );

  // 修改原来的水波纹和底座逻辑，增加我们自定义的连接圆圈状态(isCircleError)作为判断
  if (item.antStatus != 1) {
    openedRings.delete(item.antName);
    if (item.hostNumber) {
      addWaterRipples(position.x, position.y, position.z - 0, obj);
    } else {
      addWaterRipples(position.x, position.y, position.z - 300, obj);
    }
  } else if (item.isCircleError) {
    addBaseCircle(position, obj, item, true);
    if (openedRings.has(item.antName)) {
      let offsetX = item.hostNumber ? 0 : -160; 
      let offsetZ = item.hostNumber ? 0 : -300;
      createSpreadingRings(position, obj, offsetX, offsetZ, item);
    }
  } else {
    addBaseCircle(position, obj, item, false);
    if (openedRings.has(item.antName)) {
      let offsetX = item.hostNumber ? 0 : -160; 
      let offsetZ = item.hostNumber ? 0 : -300;
      createSpreadingRings(position, obj, offsetX, offsetZ, item);
    }
  }
};
// 控制显示所有报警信息框
const showAlarmHandle = () => {
  isShowAlarm.value = !isShowAlarm.value;
  dialogLineList.map((lineName) => {
    if (scene.getObjectByName(lineName)) {
      scene.getObjectByName(lineName).visible = isShowAlarm.value;
    }
  });
  model?.traverse((_obj) => {
    if (_obj.isMesh && _obj.children.length > 0) {
      _obj?.traverse((item) => {
        if (
          item.name == "waterRipples" ||
          item.name.indexOf("dialog") >= 0 ||
          item.name.indexOf("baseCircle") >= 0 ||
          item.name === "spreadingRing"
        ) {
          item.visible = isShowAlarm.value;
        }
      });
    }
  });
};
// 模拟数据变化
const mockDataChange = async () => {
  try {
    const res = await getStationAntennaList(stationId.value);
    const { hostList, antennaList } = formatAntennaList(res);
    state.antennas = [];
    
    // 过滤只显示A15和A23天线
    const filteredAntennas = antennaList.filter(
      item => item.antName === 'A15' || item.antName === 'A23'
    );
    
    // 强制设定为所需的状态
    filteredAntennas.forEach(item => {
      // 强制让 A15 和 A23 天线状态自身显示为“正常”
      item.antStatus = 1; 
      // 附加一个标记，用来判断底部的信号连接是否异常
      if (item.antName === 'A23') {
        item.isCircleError = true;
      } else {
        item.isCircleError = false;
      }
    });

    state.antennas.push(...filteredAntennas, ...hostList);

    // Dynamic change antennas material
    renderAntennaMaterial(model, state.antennas);

    // state.antennas.forEach((item) => {
    //   item.antStatus = Math.floor(Math.random() * 3 + 1);
    // });

    createAlarmDialog();
  } catch (error) {
    console.error("mockDataChange error", error);
  }
};

onMounted(async () => {
  stationId.value = parent.localStorage.getItem("stationId") || "0833";
  stationName.value = ""; // parent.localStorage.getItem("stationName") || "大鹏站"
  intervalTime.value = parent.localStorage.getItem("intervalTime") || 60;
  // 设置dom的宽高，屏幕自适应
  getDomInfo(threeDemoRef.value);
  // 启动场景、灯光、相机 实例
  init(threeDemoRef.value);
  // 动态加载模型
  await importModel(stationId);
  // 添加 控制器（移动 缩放 旋转）
  createControls();
  // 初始化 灯光
  initLight();
  // 创建天线指示牌渲染器
  createCSS3DRenderer(threeDemoRef.value);
  // 检测用户的dom大小变化
  watchDom(threeDemoRef.value);
  // 窗口的缩放
  renderResize(threeDemoRef.value);
  // 开始执行渲染循环 将所有内容具现化
  renderLoop();
  
  threeDemoRef.value.addEventListener('click', (event) => {
    const rect = threeDemoRef.value.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(baseCircleList);
    if (intersects.length > 0) {
      const circleMesh = intersects[0].object;
      const { position, obj, offsetX, offsetZ, item } = circleMesh.userData;
      
      let hasRings = false;
      obj.children.forEach(child => {
        if (child.name === "spreadingRing") hasRings = true;
      });
      
      if (hasRings) {
        // 如果已经打开，则关闭它（从视图移除并更新状态记录）
        for (let i = obj.children.length - 1; i >= 0; i--) {
          if (obj.children[i].name === "spreadingRing") {
            obj.remove(obj.children[i]);
          }
        }
        openedRings.delete(item.antName);
      } else {
        // 如果未打开，则开启它
        openedRings.add(item.antName);
        createSpreadingRings(position, obj, offsetX, offsetZ, item);
      }
    }
  });

  // 动态的获取服务器天线列表 根据数据变化实时修改天线状态
  mockDataChange();
  fetchDataTimer.value = setInterval(mockDataChange, intervalTime.value * 1000);
});

onBeforeMount(() => {
  fetchDataTimer.value && clearInterval(fetchDataTimer.value);
});
</script>
<style scoped lang="scss">
@import "../assets/station_viewer.scss";
</style>
