<script setup lang="ts">
import { ref } from 'vue'

type Task = {
  key: string
  name: string
  data: string
  model: string
  obj: string
  algo: string
}

const tasks: Task[] = [
  {
    key: 'wake',
    name: '唤醒词识别',
    data: '大量 1 秒左右的音频片段，人工标好「含唤醒词 / 不含唤醒词」',
    model: '把音频波形映射为「是 / 否」的程序，参数决定判定边界',
    obj: '分类错误率：预测与实际不符的片段占比',
    algo: '梯度下降：反复调整参数，让错误率尽可能低'
  },
  {
    key: 'house',
    name: '房价预测',
    data: '历史成交记录，每条含面积、卧室数、浴室数、通勤距离与成交价',
    model: '从特征向量映射到一个实数的函数，如 w·x + b',
    obj: '平方误差：预测价与成交价之差的平方',
    algo: '梯度下降 / 最小二乘，把 w 与 b 调到误差最小'
  },
  {
    key: 'catdog',
    name: '猫狗分类',
    data: '成千上万张照片，每张标注「猫」或「狗」',
    model: '多层网络：像素 → 边缘 → 纹理 → 部件 → 类别概率',
    obj: '交叉熵：让正确类别的预测概率尽量大',
    algo: '小批量随机梯度下降 + 反向传播'
  },
  {
    key: 'rec',
    name: '电影推荐',
    data: '用户的历史评分（显式反馈）与点击、跳过（隐式反馈）',
    model: '为用户与物品各学一个向量，用内积刻画匹配程度',
    obj: '排序损失：把用户真正喜欢的影片排到前面',
    algo: '梯度下降，只更新被观察到的用户-物品对'
  }
]

const active = ref(0)
</script>

<template>
  <Widget title="同一个四件套，不同的内容">
    <p class="widget-note">
      不管任务多不一样，拆开来看都是这四个零件。点一下任务名，看看每个零件在这个任务里具体是什么。
    </p>

    <div class="seg" style="margin-bottom:12px">
      <button
        v-for="(t, i) in tasks" :key="t.key"
        type="button" :class="{ on: active === i }"
        @click="active = i"
      >{{ t.name }}</button>
    </div>

    <div class="parts">
      <div class="part">
        <div class="part-h"><span class="tag">数据</span></div>
        <p>{{ tasks[active].data }}</p>
      </div>
      <div class="part">
        <div class="part-h"><span class="tag">模型</span></div>
        <p>{{ tasks[active].model }}</p>
      </div>
      <div class="part">
        <div class="part-h"><span class="tag">目标函数</span></div>
        <p>{{ tasks[active].obj }}</p>
      </div>
      <div class="part">
        <div class="part-h"><span class="tag">优化算法</span></div>
        <p>{{ tasks[active].algo }}</p>
      </div>
    </div>
  </Widget>
</template>

<style scoped>
.parts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.part { background: var(--vp-c-bg); border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; }
.part-h { margin-bottom: 2px; }
.part-h .tag { font: 700 11px var(--vp-font-family-base); letter-spacing: .06em; background: var(--accent); color: #fff; padding: 1px 7px; border-radius: 5px; }
.part p { margin: 6px 0 0; font-size: 14px; line-height: 1.7; color: var(--ink-2); }
@media (max-width: 640px) { .parts { grid-template-columns: 1fr; } }
</style>
