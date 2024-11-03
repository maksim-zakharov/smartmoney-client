// file vite-plugin-close.ts

import { PluginOption } from "vite";

export default function ClosePlugin(): PluginOption {
  return {
    name: 'ClosePlugin', // required, will show up in warnings and errors

    // use this to catch errors when building
    buildEnd(error) {
      if(error) {
        console.error('Error bundling')
        console.error(error)
        process.exit(1)
      } else {
        console.log('Build ended')
      }
    },

    // use this to catch the end of a build without errors
    closeBundle() {
      console.log('Bundle closed')
      process.exit(0)
    },
  }
}