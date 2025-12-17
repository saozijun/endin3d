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

const dialogRef = ref();
const threeDemoRef = ref();
const isShowAlarm = ref(true);
const fetchDataTimer = ref();
const stationId = ref();
const stationName = ref();
const intervalTime = ref(15);
const loadingInstance = ref();

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

  model?.traverse((_obj) => {
    if (_obj.children.length > 0 && _obj.isMesh) {
      // 移除dialog 和 水波纹
      const len = _obj.children.length;
      for (let index = 0; index < len; index++) {
        if (
          _obj.children[0].name == "waterRipples" ||
          _obj.children[0].name.indexOf("dialog") >= 0
        ) {
          _obj.remove(_obj.children[0]);
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
          insertAntennasDialogHtml(_obj, item, state.positionMap[item.antName]);
        }
      });
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

  if (item.antStatus != 1) {
    // 添加红色水波纹
    if (item.hostNumber) {
      addWaterRipples(position.x, position.y, position.z - 0, obj);
    } else {
      addWaterRipples(position.x, position.y, position.z - 300, obj);
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
        if (item.name == "waterRipples" || item.name.indexOf("dialog") >= 0) {
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
    state.antennas.push(...antennaList, ...hostList);

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
  stationName.value = parent.localStorage.getItem("stationName") || "大鹏站";
  intervalTime.value = parent.localStorage.getItem("intervalTime") || 15;
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
