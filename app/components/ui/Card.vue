<template>
  <div class="ui-card"><slot /></div>
</template>

<style scoped>
.ui-card {
  background: rgb(var(--surface) / 0.04);
  border: 1px solid rgb(var(--border-subtle) / 0.08);
  border-radius: 12px;
  padding: 14px;
}
</style>
