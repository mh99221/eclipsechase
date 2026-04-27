<template>
  <div class="ui-card-title"><slot /></div>
</template>

<style scoped>
.ui-card-title {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(var(--ink-1) / 0.62);
  margin-bottom: 12px;
}
</style>
