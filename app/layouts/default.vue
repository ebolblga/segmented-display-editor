<script setup lang="ts">

</script>
<template>
    <div class="m-0 bg-background text-xs text-text lg:text-sm">
        <slot />
    </div>
</template>

<style>
body {
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    background-color: #0d1016;
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    box-shadow: transparent;
}

::-webkit-scrollbar-thumb {
    background-color: darkgrey;
    outline: 1px solid slategrey;
    border-radius: 4px;
}

::-webkit-scrollbar-corner {
    background: transparent;
}
</style>
