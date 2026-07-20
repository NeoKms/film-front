<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const privacyAccepted = ref(true);
const privacyError = ref('');
const googlePrivacyConsent = useCookie<boolean | null>(
  'google-privacy-consent',
  {
    default: () => null,
    maxAge: 60 * 10,
    sameSite: 'lax',
  },
);
const googleOauth2 = async () => {
  if (!privacyAccepted.value) {
    privacyError.value = 'Нужно согласие на обработку данных';
    return;
  }
  privacyError.value = '';
  googlePrivacyConsent.value = true;
  const clientId = runtimeConfig.public.GOOGLE_CLIENT_ID;
  const redirectUrl = window.location.origin + '/oauth2';
  await navigateTo(
    `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUrl}&access_type=offline&response_type=code&scope=https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile`,
    { external: true },
  );
};
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <label
      v-if="false"
      class="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-zinc-400"
    >
      <input
        v-model="privacyAccepted"
        type="checkbox"
        class="mt-1 accent-amber-300"
        @change="privacyError = ''"
      />
      <span>
        Я отдельно даю согласие на получение от Google и обработку email, имени
        профиля и технических данных в соответствии с
        <NuxtLink
          to="/legal/privacy"
          target="_blank"
          class="text-amber-300 underline"
          >политикой</NuxtLink
        >.
      </span>
    </label>
    <p v-if="privacyError" class="w-full text-xs text-red-300">
      {{ privacyError }}
    </p>
    <button
      v-if="runtimeConfig.public.GOOGLE_CLIENT_ID"
      type="button"
      class="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10"
      @click="googleOauth2()"
    >
      <div class="rounded-full bg-white p-2">
        <svg class="w-4" viewBox="0 0 533.5 544.3">
          <path
            d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
            fill="#4285f4"
          />
          <path
            d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
            fill="#34a853"
          />
          <path
            d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
            fill="#fbbc04"
          />
          <path
            d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
            fill="#ea4335"
          />
        </svg>
      </div>
      <span class="ml-4">Продолжить с Google</span>
    </button>
    <p
      v-if="runtimeConfig.public.GOOGLE_CLIENT_ID"
      class="text-center text-[11px] leading-4 text-zinc-500"
    >
      Продолжая, вы принимаете
      <NuxtLink to="/legal/terms" target="_blank" class="underline"
        >пользовательское соглашение</NuxtLink
      >
      и
      <NuxtLink to="/legal/privacy" target="_blank" class="underline"
        >политику обработки данных</NuxtLink
      >.
    </p>
    <p v-else class="text-center text-xs text-zinc-600">
      Google OAuth не настроен в этом окружении.
    </p>
  </div>
</template>

<style scoped></style>
