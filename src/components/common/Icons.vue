<template>
  <span :style="{ width: size + 'px', height: size + 'px' }" class="icon-wrapper">
    
    <svg v-if="name === 'monitor'" viewBox="0 0 24 24" :width="size" :height="size" fill="none">
      <path d="M3 13H8.5L10 15L12 9L14 13H17M6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V8.2C21 7.0799 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.07989 19 6.2 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>

    <svg v-if="name === 'save'" viewBox="0 0 32 32" :width="size" :height="size" fill="none">
      <path 
        fill="currentColor" 
        d="M9.467 3.106h3.030c0.266 0 0.482 0.278 0.482 0.621v4.374c0 0.343-0.216 0.621-0.482 0.621h-3.030c-0.266 0-0.482-0.278-0.482-0.621v-4.374c0-0.343 0.216-0.621 0.482-0.621zM21.964 14.524l7.987 7.987h-3.993v7.987h-7.987v-7.987h-3.993l7.987-7.987zM17.422 24.768h-10.309c-0.276 0-0.499-0.223-0.499-0.499v-11.481c0-0.276 0.223-0.499 0.499-0.499h17.721c0.276 0 0.499 0.223 0.499 0.499v4.402l3.12 3.12v-13.262c0-0.276-4.216-4.493-4.493-4.493h-4.741c0.169 0.069 0.287 0.223 0.287 0.404v6.181c0 0.244-0.216 0.442-0.482 0.442h-10.594c-0.266 0-0.482-0.198-0.482-0.442v-6.181c0-0.18 0.118-0.335 0.287-0.404h-4.242c-0.277 0-0.499 0.223-0.499 0.499v23.961c0 0.277 0.223 0.499 0.499 0.499h13.429v-2.746zM26.506 22.903v4.611h1.449c0.277 0 0.499-0.223 0.499-0.499v-4.111l-1.948 0z"
      />
    </svg>

    <svg v-else-if="name === 'test-list'" viewBox="0 0 24 24" :width="size" :height="size" fill="none">
      <path 
        d="M11 6L21 6.00072M11 12L21 12.0007M11 18L21 18.0007M3 11.9444L4.53846 13.5L8 10M3 5.94444L4.53846 7.5L8 4M4.5 18H4.51M5 18C5 18.2761 4.77614 18.5 4.5 18.5C4.22386 18.5 4 18.2761 4 18C4 17.7239 4.22386 17.5 4.5 17.5C4.77614 17.5 5 17.7239 5 18Z" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
    </svg>

    <svg v-else-if="name === 'stress'" viewBox="0 0 32 32" :width="size" :height="size" fill="none">
      <path d="M11.87 30.782c2.827-0.004 6.12-0.016 8.583-0.022 6.399-4.805 0.449-11.341-4.919-10.395 4.74 3.583 0.616 9.454-3.664 10.417zM23.245 6.173c0.001 0.045 0 0.090 0 0.136 4.927 11.598-8.514 11.801-7.44 0.717-2.601 6.269-8.292-0.134-5.683-5.695v-0c-11.473 6.657 3.244 14.186-0.636 20.745-2.189 3.7-7.109-1.768-6.756-7.912-3.107 7.886-0.845 13.525 3.212 16.583 0.107 0.026 1.583 0.036 3.653 0.037-0.212-0.054-0.419-0.125-0.622-0.214-1.335-0.586-2.12-3.808 1.822-5.503-0.787 4.838 8.606 0.838 1.458-10.24l0-0c5.318 1.677 8.675 3.745 11.078 7.434 1.694-1.511 2.91-4.074 3.28-6.596 2.713 4.869 1.466 12.355-4.95 15.092 1.419-0.003 2.37-0.002 2.471 0.005 9.657-2.17 8.694-15.283-0.886-24.589z" fill="currentColor" />
    </svg>

    <svg v-else-if="name === 'tests'" viewBox="0 0 287.403 287.403" :width="size" :height="size" fill="none">
      <g fill="currentColor">
        <path d="M197.095,253.646H30V33.757h167.095v12.214l29.767-29.767c-1.214-7.066-7.355-12.447-14.767-12.447H15 c-8.284,0-15,6.716-15,15v249.89c0,8.284,6.716,15,15,15h197.095c8.284,0,15-6.716,15-15V159.041l-30,7.533V253.646z"/>
        <path d="M140.161,73.802c-5.169-6.474-14.605-7.533-21.081-2.366L84.964,98.667L74.647,88.352c-5.857-5.857-15.355-5.857-21.213,0 c-5.858,5.857-5.858,15.355,0,21.213l19.799,19.799c2.912,2.912,6.753,4.394,10.61,4.394c3.296,0,6.604-1.081,9.354-3.276 l44.598-35.598C144.27,89.715,145.329,80.276,140.161,73.802z"/>
        <path d="M119.08,168.366l-34.116,27.232l-10.316-10.316c-5.857-5.859-15.355-5.857-21.213,0s-5.858,15.354,0,21.213l19.799,19.8 c2.912,2.912,6.752,4.394,10.61,4.394c3.296,0,6.604-1.082,9.354-3.276l44.598-35.599c6.475-5.169,7.534-14.606,2.366-21.081 C134.992,164.259,125.556,163.199,119.08,168.366z"/>
        <path d="M276.798,12.959c-2.587,0-5.224,0.96-7.37,3.105l-71.389,71.39c-3.502,3.501-5.988,7.887-7.194,12.69l-7.66,30.506 c-0.358,1.424-0.235,2.96,0.497,4.232c1.021,1.774,2.857,2.765,4.756,2.765c0.444,0,0.891-0.054,1.332-0.165l30.704-7.71 c4.803-1.206,9.189-3.692,12.69-7.194l43.493-43.493c6.881-6.881,10.747-16.214,10.747-25.946V23.51 C287.403,17.163,282.21,12.959,276.798,12.959z"/>
      </g>
    </svg>

<svg v-else-if="name === 'settings'" viewBox="0 0 24 24" :width="size" :height="size" fill="none">
      <path 
        d="M20.59,12a8.12,8.12,0,0,0-.15-1.57l2.09-1.2-2.87-5-2.08,1.2a8.65,8.65,0,0,0-2.72-1.56V1.5H9.14V3.91A8.65,8.65,0,0,0,6.42,5.47L4.34,4.27l-2.87,5,2.09,1.2a8.29,8.29,0,0,0,0,3.14l-2.09,1.2,2.87,5,2.08-1.2a8.65,8.65,0,0,0,2.72,1.56V22.5h5.72V20.09a8.65,8.65,0,0,0,2.72-1.56l2.08,1.2,2.87-5-2.09-1.2A8.12,8.12,0,0,0,20.59,12Z" 
        stroke="currentColor" stroke-width="1.91" stroke-miterlimit="10"
      />
      <circle cx="12" cy="12" r="3.82" stroke="currentColor" stroke-width="1.91" stroke-miterlimit="10" />
    </svg>

    <svg v-else-if="name === 'about'" viewBox="0 0 24 24" :width="size" :height="size" fill="none">
      <path fill="currentColor" d="M20,2H4C2.9,2,2,2.9,2,4v16c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2z M13,17h-2v-2h2V17z M13,14h-2 c0-2.6,2-2.1,2-4.2c0-0.4-0.2-1.3-1.1-1.3c-0.3,0-1,0.5-1,1.5H9c0,0-0.4-3,2.9-3C14.5,7,15,8.9,15,9.8C15,12.1,13,12.3,13,14z"/>
    </svg>

    <svg v-else-if="name === 'info'" viewBox="0 0 24 24" :width="size" :height="size" fill="none">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22ZM12 17.75C12.4142 17.75 12.75 17.4142 12.75 17V11C12.75 10.5858 12.4142 10.25 12 10.25C11.5858 10.25 11.25 10.5858 11.25 11V17C11.25 17.4142 11.5858 17.75 12 17.75ZM12 7C12.5523 7 13 7.44772 13 8C13 8.55228 12.5523 9 12 9C11.4477 9 11 8.55228 11 8C11 7.44772 11.4477 7 12 7Z" fill="currentColor" />
    </svg>


<svg v-else-if="name === 'lcd'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>

    <svg v-else-if="name === 'touchpad'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="4"></rect>
      <line x1="4" y1="10" x2="20" y2="10"></line>
      <line x1="12" y1="2" x2="12" y2="10"></line>
    </svg>

    <svg v-else-if="name === 'keyboard'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"></rect>
      <line x1="6" y1="9" x2="6" y2="9"></line>
      <line x1="10" y1="9" x2="10" y2="9"></line>
      <line x1="14" y1="9" x2="14" y2="9"></line>
      <line x1="18" y1="9" x2="18" y2="9"></line>
      <line x1="6" y1="13" x2="6" y2="13"></line>
      <line x1="18" y1="13" x2="18" y2="13"></line>
      <line x1="10" y1="13" x2="14" y2="13"></line>
    </svg>

    <svg v-else-if="name === 'mic'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>

    <svg v-else-if="name === 'speaker'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    </svg>

    <svg v-else-if="name === 'webcam'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="10" r="8"></circle>
      <circle cx="12" cy="10" r="3"></circle>
      <path d="M7 22h10"></path>
      <path d="M12 18v4"></path>
    </svg>

<svg v-else-if="name === 'usb'" viewBox="0 0 24 24" :width="size" :height="size" fill="none">
      <circle cx="12" cy="20" r="2" stroke="currentColor" stroke-width="1.5"></circle>
      <circle cx="6" cy="6" r="1" stroke="currentColor" stroke-width="1.5"></circle>
      <path d="M11.25 18C11.25 18.4142 11.5858 18.75 12 18.75C12.4142 18.75 12.75 18.4142 12.75 18H11.25ZM12 2L12.624 1.58397C12.4849 1.37533 12.2508 1.25 12 1.25C11.7492 1.25 11.5151 1.37533 11.376 1.58397L12 2ZM13.376 5.41603C13.6057 5.76067 14.0714 5.8538 14.416 5.62404C14.7607 5.39427 14.8538 4.92862 14.624 4.58397L13.376 5.41603ZM9.37596 4.58397C9.1462 4.92862 9.23933 5.39427 9.58397 5.62404C9.92862 5.8538 10.3943 5.76067 10.624 5.41603L9.37596 4.58397ZM11.25 6.5C11.25 6.91421 11.5858 7.25 12 7.25C12.4142 7.25 12.75 6.91421 12.75 6.5H11.25ZM12.75 9.75C12.75 9.33579 12.4142 9 12 9C11.5858 9 11.25 9.33579 11.25 9.75H12.75ZM11.376 2.41603L13.376 5.41603L14.624 4.58397L12.624 1.58397L11.376 2.41603ZM11.376 1.58397L9.37596 4.58397L10.624 5.41603L12.624 2.41603L11.376 1.58397ZM12.75 18V15H11.25V18H12.75ZM12.75 6.5V2H11.25V6.5H12.75ZM12.75 15V9.75H11.25V15H12.75Z" fill="currentColor"></path>
      <path d="M6 7V9.55848C6 10.4193 6.55086 11.1836 7.36754 11.4558L10.6325 12.5442C11.4491 12.8164 12 13.5807 12 14.4415V15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
      <path d="M18 10V12.5585C18 13.4193 17.4491 14.1836 16.6325 14.4558L13.3675 15.5442C12.5509 15.8164 12 16.5807 12 17.4415V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
      <path d="M17 9C17 8.5286 17 8.29289 17.1464 8.14645C17.2929 8 17.5286 8 18 8C18.4714 8 18.7071 8 18.8536 8.14645C19 8.29289 19 8.5286 19 9C19 9.4714 19 9.70711 18.8536 9.85355C18.7071 10 18.4714 10 18 10C17.5286 10 17.2929 10 17.1464 9.85355C17 9.70711 17 9.4714 17 9Z" stroke="currentColor" stroke-width="1.5"></path>
    </svg>

    <svg v-else-if="name === 'network'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>

    <svg v-else-if="name === 'battery'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 7h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-3"></path> 
      
      <path d="M7 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path> 
      
      <polyline points="11 7 8 12 12 12 9 17"></polyline> 
      
      <line x1="22" x2="22" y1="11" y2="13"></line>
    </svg>

<svg v-else-if="name === 'touchscreen'" viewBox="0 0 496 496" :width="size" :height="size" fill="currentColor">
      <path d="M496,40c0-22.056-17.944-40-40-40H40C17.944,0,0,17.944,0,40v240c0,22.056,17.944,40,40,40h206.84 c-4.384,7.304-6.84,15.784-6.84,24.72v68.688c0,24.144,15.392,45.496,38.288,53.12l9.712,3.24V496h16v-37.768l-20.648-6.88 C266.992,445.896,256,430.648,256,413.408V344.72c0-12.192,6.776-23.168,17.688-28.616l14.312-7.16V360h16V136 c0-8.824,7.176-16,16-16c8.824,0,16,7.176,16,16v128v24h16v-24c0-8.824,7.176-16,16-16c8.824,0,16,7.176,16,16v16v8v16h16v-16v-8 c0-8.824,7.176-16,16-16c8.824,0,16,7.176,16,16v16v8v16h16v-16v-8c0-8.824,7.176-16,16-16c8.824,0,16,7.176,16,16v138.336 c0,15.24-8.472,28.952-22.112,35.776L448,475.056V496h16v-11.056l1.048-0.52C484.144,474.864,496,455.68,496,434.336V296 c0-2.688-0.432-5.256-1.064-7.752c0.648-2.896,1.064-5.624,1.064-8.248V40z M48,304h-8c-13.232,0-24-10.768-24-24V40 c0-13.232,10.768-24,24-24h8V304z M288,192H144v-32h144V192z M288,136v8H128v64h160v64H96V112h203.056 C292.336,117.872,288,126.392,288,136z M384,236.448c-4.728-2.752-10.144-4.448-16-4.448c-5.856,0-11.272,1.696-16,4.448V136 c0-9.608-4.336-18.128-11.056-24H384V236.448z M384,96H96V48h288V96z M416,248c-5.856,0-11.272,1.696-16,4.448V32H80v256h208 v3.056l-21.472,10.736c-1.312,0.656-2.52,1.448-3.752,2.208H64V16h352V248z M480,268.448c-4.728-2.752-10.144-4.448-16-4.448 c-6.632,0-12.8,2.032-17.912,5.496c-2.536-7.24-7.552-13.24-14.088-17.048V16h24c13.232,0,24,10.768,24,24V268.448z"></path>
      <rect x="448" y="120" width="16" height="80"></rect>
      <rect x="112" y="64" width="16" height="16"></rect>
      <rect x="144" y="64" width="16" height="16"></rect>
      <rect x="176" y="64" width="16" height="16"></rect>
    </svg>

<svg v-else-if="name === 'joystick'" viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="6" width="22" height="13" rx="3"></rect>
      
      <path d="M6 12h4"></path>
      <path d="M8 10v4"></path>
      
      <circle cx="16.5" cy="9.5" r="0.5" fill="currentColor"></circle>
      <circle cx="14.5" cy="11.5" r="0.5" fill="currentColor"></circle>
      <circle cx="18.5" cy="11.5" r="0.5" fill="currentColor"></circle>
      <circle cx="16.5" cy="13.5" r="0.5" fill="currentColor"></circle>
    </svg>

<svg v-else-if="name === 'fingerprint'" viewBox="0 0 48 48" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M42.4309 12.0391C37.7023 7.38257 31.1542 4.5 23.9187 4.5C16.7257 4.5 10.2121 7.34876 5.48999 11.9571"></path>
      <path d="M6.66675 29.4743V29.4167C6.66675 19.8437 14.4271 12.0833 24.0001 12.0833"></path>
      <path d="M31.1694 13.6309C37.1649 16.3582 41.3333 22.4006 41.3333 29.4167V29.4296"></path>
      <path d="M14.25 37V29.4167C14.25 24.0319 18.6152 19.6667 24 19.6667C29.3848 19.6667 33.75 24.0319 33.75 29.4167V37"></path>
      <path d="M17.5261 43.5C19.489 43.0154 20.75 40.9456 20.75 39.196C20.75 37.3354 20.75 34.4367 20.75 30.5C20.75 28.7051 22.2051 27.25 24 27.25C25.795 27.25 27.25 28.7051 27.25 30.5V39.196"></path>
    </svg>

  </span>
</template>

<script setup>
defineProps({
  name: String,
  size: { type: [String, Number], default: 24 }
});
</script>

<style scoped>
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
svg {
  display: block;
}
</style>