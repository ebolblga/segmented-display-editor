/** @type {import('tailwindcss').Config} */

import { colors } from './types/tailwindcss'

export default {
    content: [],
    theme: {
        extend: {},
        colors: {
            ...colors,
        },
    },
    plugins: [],
}
