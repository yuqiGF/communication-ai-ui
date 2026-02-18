<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5c0-5.523 4.477-10 10-10z"></path><path d="M8.5 8.5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 1 0 5"></path><path d="M12 12h.01"></path></svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-800">通信原理智能助手</h2>
        <p class="text-gray-500 mt-2">请登录以保存您的学习进度</p>
      </div>

      <n-form ref="formRef" :model="formValue" :rules="rules">
        <n-form-item label="用户名" path="user.name">
          <n-input v-model:value="formValue.user.name" placeholder="请输入用户名 (admin)" size="large">
            <template #prefix>
              <n-icon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </n-icon>
            </template>
          </n-input>
        </n-form-item>
        <n-form-item label="密码" path="user.password">
          <n-input
              v-model:value="formValue.user.password"
              type="password"
              show-password-on="click"
              placeholder="请输入密码 (123456)"
              size="large"
              @keydown.enter.prevent="handleLogin"
          >
            <template #prefix>
              <n-icon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </n-icon>
            </template>
          </n-input>
        </n-form-item>

        <n-button
            type="primary"
            block
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="mt-4"
        >
          登 录
        </n-button>
      </n-form>

      <div class="mt-6 text-center text-xs text-gray-400">
        Demo 演示账号: admin / 123456
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui';
import { login } from '../api/chatService';

const emit = defineEmits(['loginSuccess']);
const message = useMessage();
const loading = ref(false);

const formValue = ref({
  user: {
    name: 'admin',
    password: ''
  }
});

const rules = {
  user: {
    name: { required: true, message: '请输入用户名', trigger: 'blur' },
    password: { required: true, message: '请输入密码', trigger: 'blur' }
  }
};

const handleLogin = async () => {
  if (!formValue.value.user.name || !formValue.value.user.password) {
    message.warning('请填写完整信息');
    return;
  }

  loading.value = true;
  try {
    // 调用 API 登录
    const data = await login(formValue.value.user.name, formValue.value.user.password);
    message.success('登录成功');
    emit('loginSuccess', data.user);
  } catch (error: any) {
    message.error(error.message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>