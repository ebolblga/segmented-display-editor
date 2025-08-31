<script setup lang="ts">
useHead({
    htmlAttrs: {
        lang: 'en',
    },
    meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
            name: 'description',
            content:
                'A web application to design and preview custom segmented displays',
        },
        {
            name: 'keywords',
            content:
                'yal, segmented displays, pixel, fonts, 7 segment display, bitmaps',
        },
        { name: 'author', content: 'ebolblga' },
        { name: 'robots', content: 'index, follow' },
        { property: 'og:type', content: 'website' },
        {
            property: 'og:title',
            content: 'Segmented Display Editor',
        },
        {
            property: 'og:description',
            content:
                'A web application to design and preview custom segmented displays',
        },
    ],
    link: [
        {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    ],
    script: [
        {
            type: 'application/ld+json',
        },
    ],
})
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
