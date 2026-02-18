/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        // 引入 Typography 插件，专门用于渲染 Markdown 内容
        require('@tailwindcss/typography'),
    ],
}