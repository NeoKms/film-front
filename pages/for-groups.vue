<script setup lang="ts">
import { SEO_INTENT_PAGES } from '~/utils/seo-intent-pages';

const page = SEO_INTENT_PAGES.group;
</script>

<template><seo-intent-page :page="page" /></template>
