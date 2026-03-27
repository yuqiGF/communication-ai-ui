<template>
  <div class="w-full h-full relative" ref="chartRef">
    <!-- 加载动画覆盖层 -->
    <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-10 backdrop-blur-sm transition-all duration-300">
      <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-sm font-medium text-blue-600 mt-3">{{ loadingText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as echarts from 'echarts';
// 注意：确保你的 chatService.ts 中已经按照之前的要求添加了 expandNeo4jGraph 方法
import { fetchNeo4jGraph, expandNeo4jGraph } from '../../api/chatService';

const props = defineProps({
  graphData: {
    type: Object,
    required: true,
    default: () => ({ nodes: [], edges: [] })
  }
});

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// 加载状态控制
const isLoading = ref(false);
const loadingText = ref('图谱模型生成中...');

// 本地维护动态扩展的图谱数据池
const localGraphData = ref({ nodes: [] as any[], edges: [] as any[] });
const visibleNodeIds = ref<Set<string>>(new Set());

// 渲染图表
const updateChart = () => {
  if (!chartInstance) return;

  // 映射当前需要展示的节点，并加上基础样式
  const displayNodes = localGraphData.value.nodes
      .filter(n => visibleNodeIds.value.has(n.id))
      .map(n => ({
        ...n,
        symbolSize: n.symbolSize || 40,
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.15)'
        }
      }));

  // 映射当前需要展示的边
  const displayEdges = localGraphData.value.edges.filter(e =>
      visibleNodeIds.value.has(e.source) && visibleNodeIds.value.has(e.target)
  );

  const option = {
    tooltip: { formatter: '{b}' },
    color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452'],
    animationDurationUpdate: 1000,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: displayNodes,
        links: displayEdges,
        roam: true, // 开启鼠标拖拽和平移缩放
        draggable: true, // 节点可拖拽
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        edgeSymbol: ['circle', 'arrow'],
        edgeSymbolSize: [4, 8],
        edgeLabel: {
          show: true,
          fontSize: 10,
          formatter: (params: any) => params.data.label || ''
        },
        force: {
          repulsion: 500, // 节点之间的排斥力，稍微大一点防止拥挤
          edgeLength: [80, 150], // 边的长度范围
          gravity: 0.1
        },
        lineStyle: {
          color: 'source',
          curveness: 0.2,
          opacity: 0.7
        }
      }
    ]
  };

  chartInstance.setOption(option);
};

// 【核心逻辑】双击节点发起网络请求，无限扩展图谱
const handleDoubleClick = async (params: any) => {
  if (params.dataType === 'node') {
    const nodeName = params.data.name;

    // 开启加载动画
    isLoading.value = true;
    loadingText.value = `正在探索 [${nodeName}] 的关联知识...`;

    try {
      // 1. 发送 Ajax 请求获取该节点周边的最新数据 (绕过大模型直接查Neo4j)
      const newData = await expandNeo4jGraph(nodeName);

      if (!newData || !newData.nodes || newData.nodes.length === 0) {
        console.log('该节点没有更多的扩展数据了。');
        return;
      }

      // 2. 节点合并去重
      const existingNodeIds = new Set(localGraphData.value.nodes.map(n => n.id));
      let addedNewNodes = false;

      newData.nodes.forEach((n: any) => {
        if (!existingNodeIds.has(n.id)) {
          localGraphData.value.nodes.push(n);
          addedNewNodes = true;
        }
        visibleNodeIds.value.add(n.id); // 保证查到的节点呈现可见状态
      });

      // 3. 边合并去重 (考虑无向图概念，防重)
      const existingEdges = new Set(localGraphData.value.edges.map(e => `${e.source}-${e.target}`));
      newData.edges.forEach((e: any) => {
        const edgeKey = `${e.source}-${e.target}`;
        const reverseKey = `${e.target}-${e.source}`;
        // 如果正向和反向的边都不存在，则追加进数组
        if (!existingEdges.has(edgeKey) && !existingEdges.has(reverseKey)) {
          localGraphData.value.edges.push(e);
        }
      });

      // 4. 如果确实增加了新节点，重新渲染图表
      if (addedNewNodes) {
        updateChart();
      }

    } catch (error) {
      console.error('节点扩展请求失败:', error);
    } finally {
      // 关闭加载动画
      isLoading.value = false;
    }
  }
};

// 初始化 Echarts 实例
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value);
    // 绑定双击事件到我们写好的请求方法上
    chartInstance.on('dblclick', handleDoubleClick);
  }
};

// 监听父组件(HomeView)传来的初次搜索图谱数据
watch(() => props.graphData, (newData) => {
  if (newData && newData.nodes && newData.nodes.length > 0) {
    isLoading.value = true;
    loadingText.value = '图谱模型生成中...';

    // 深拷贝初始化本地数据池，防止污染 props
    localGraphData.value = JSON.parse(JSON.stringify(newData));
    visibleNodeIds.value.clear();

    // 初始状态下，让所有由后端传来的节点都可见
    localGraphData.value.nodes.forEach(n => visibleNodeIds.value.add(n.id));

    setTimeout(() => {
      updateChart();
      isLoading.value = false;
    }, 400);
  }
}, { deep: true });

onMounted(() => {
  initChart();

  // 处理组件初次挂载时如果已经有数据的情况
  if (props.graphData && props.graphData.nodes?.length > 0) {
    localGraphData.value = JSON.parse(JSON.stringify(props.graphData));
    localGraphData.value.nodes.forEach(n => visibleNodeIds.value.add(n.id));
    updateChart();
  }

  // 监听窗口大小变化
  window.addEventListener('resize', resizeHandler);
});

const resizeHandler = () => chartInstance?.resize();

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler);
  chartInstance?.dispose();
});
</script>