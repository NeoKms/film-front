<script setup lang="ts">
import type { IFilmItem } from '~/stores/film';
import { EPersonPosition } from '~/stores/person';

const route = useRoute();
const filmStore = useFilmStore();
const id = computed(() => route.params.id as string);
const returnTo = computed(() => {
  const from = typeof route.query.from === 'string' ? route.query.from : '';
  return /^\/room\/[a-f\d]{24}(?:\?.*)?$/i.test(from) ? from : '/';
});
const returnLabel = computed(() =>
  returnTo.value === '/' ? 'На главную' : 'Вернуться в комнату',
);

const { data: film, status } = await useAsyncData<IFilmItem | null>(
  `film-${id.value}`,
  () => filmStore.getById(id.value),
  { watch: [id] },
);

const positionLabels: Record<EPersonPosition, string> = {
  [EPersonPosition.Actors]: 'В ролях',
  [EPersonPosition.Directors]: 'Режиссёры',
  [EPersonPosition.Producers]: 'Продюсеры',
  [EPersonPosition.Scriptwriters]: 'Сценаристы',
  [EPersonPosition.Artists]: 'Художники',
  [EPersonPosition.Operators]: 'Операторы',
  [EPersonPosition.Mounters]: 'Монтажёры',
  [EPersonPosition.DubbingActors]: 'Актёры дубляжа',
  [EPersonPosition.Composers]: 'Композиторы',
};
const positionOrder = Object.values(EPersonPosition);
const peopleScroller = ref<HTMLElement | null>(null);
const peopleGroups = computed(() => {
  return groupFilmPeople(film.value?.person_items ?? [], positionOrder).map(
    ({ position, people }) => ({
      key: position,
      label: positionLabels[position as EPersonPosition] ?? position,
      people,
    }),
  );
});
const activeTeamKey = ref('');
const teamExpanded = ref(false);
watch(
  peopleGroups,
  (groups) => {
    if (!groups.some((group) => group.key === activeTeamKey.value))
      activeTeamKey.value = groups[0]?.key ?? '';
  },
  { immediate: true },
);
watch(activeTeamKey, () => {
  teamExpanded.value = false;
});
const activeTeam = computed(() =>
  peopleGroups.value.find((group) => group.key === activeTeamKey.value),
);
const trailerEmbedUrl = computed(() => {
  if (!film.value?.trailer_url) return null;
  try {
    const url = new URL(film.value.trailer_url);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be')
      return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id =
        url.searchParams.get('v') ??
        url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === 'rutube.ru') {
      const id = url.pathname.match(/\/video\/(?:private\/)?([^/]+)/)?.[1];
      return id ? `https://rutube.ru/play/embed/${id}` : null;
    }
    if (host.split('.').some((part) => part.includes('poiskkino'))) return null;
    return url.toString();
  } catch {
    return null;
  }
});

useHead({ title: computed(() => film.value?.name ?? 'Фильм') });
useSeoMeta({ robots: 'noindex, nofollow' });
</script>

<template>
  <main class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
    <NuxtLink
      :to="returnTo"
      class="inline-flex min-h-11 items-center text-sm text-zinc-400 transition hover:text-white"
      >← {{ returnLabel }}</NuxtLink
    >

    <div v-if="status === 'pending'" class="grid min-h-80 place-items-center">
      <design-system-loading />
    </div>
    <div
      v-else-if="!film"
      class="mx-auto mt-16 max-w-md rounded-3xl border border-dashed border-white/15 p-8 text-center"
    >
      <p class="text-xl text-white">Фильм не найден</p>
      <p class="mt-2 text-sm text-zinc-500">
        Возможно, он больше недоступен в каталоге.
      </p>
    </div>

    <template v-else>
      <section
        class="relative mt-4 overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 sm:mt-6"
      >
        <img
          v-if="film.cover_url"
          :src="film.cover_url"
          alt=""
          class="absolute inset-0 h-full w-full object-cover opacity-25"
          aria-hidden="true"
        />
        <div
          class="absolute inset-0 bg-gradient-to-r from-[#111318] via-[#111318]/90 to-[#111318]/50"
        />
        <div class="relative grid gap-6 p-5 sm:grid-cols-[12rem_1fr] sm:p-8">
          <film-poster
            :src="film.poster_url"
            :alt="film.name"
            class="mx-auto aspect-[2/3] w-44 rounded-2xl shadow-2xl shadow-black/50 sm:w-full"
          />
          <div class="self-end">
            <div class="flex flex-wrap gap-2 text-xs">
              <span
                v-if="film.rating"
                class="rounded-full bg-amber-300 px-3 py-1 font-bold text-zinc-950"
                >Рейтинг {{ film.rating.toFixed(1) }}</span
              ><span
                v-if="film.rating_age !== null"
                class="rounded-full bg-white/15 px-3 py-1 text-white"
                >{{ film.rating_age }}+</span
              >
            </div>
            <h1
              class="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl"
            >
              {{ film.name }}
            </h1>
            <p class="mt-3 text-sm text-zinc-300">
              {{ film.year
              }}<template v-if="film.duration">
                · {{ film.duration }} мин</template
              ><template v-if="film.country_names.length">
                · {{ film.country_names.join(', ') }}</template
              >
            </p>
            <div v-if="film.tag_names.length" class="mt-5 flex flex-wrap gap-2">
              <span
                v-for="tag in film.tag_names"
                :key="tag"
                class="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300"
                >{{ tag }}</span
              >
            </div>
          </div>
        </div>
      </section>

      <section
        class="mt-9 grid min-w-0 gap-6"
        :class="{
          'lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]': trailerEmbedUrl,
        }"
      >
        <article
          class="min-w-0 rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7"
        >
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
          >
            Сюжет
          </p>
          <h2 class="mt-2 text-2xl font-medium text-white">О фильме</h2>
          <p
            class="mt-4 break-words whitespace-pre-line text-sm leading-7 text-zinc-300 [overflow-wrap:anywhere] sm:text-base"
          >
            {{ film.description || 'Описание пока отсутствует.' }}
          </p>
        </article>
        <article
          v-if="film.trailer_url && trailerEmbedUrl"
          class="min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900"
        >
          <div class="px-5 py-4">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
              >
                Видео
              </p>
              <h2 class="mt-1 text-lg font-medium text-white">Трейлер</h2>
            </div>
          </div>
          <div class="aspect-video bg-black">
            <iframe
              :src="trailerEmbedUrl"
              :title="`Трейлер фильма ${film.name}`"
              class="h-full w-full"
              loading="lazy"
              allow="
                accelerometer;
                autoplay;
                clipboard-write;
                encrypted-media;
                gyroscope;
                picture-in-picture;
                web-share;
              "
              allowfullscreen
            />
          </div>
        </article>
      </section>

      <section
        v-if="peopleGroups.length"
        class="mt-6 min-w-0 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7"
      >
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
            >
              Участники
            </p>
            <h2 class="mt-2 text-2xl font-medium text-white">Команда фильма</h2>
          </div>
          <p class="text-xs text-zinc-500">
            {{ film.person_items.length }} участников
          </p>
        </div>
        <div class="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2">
          <button
            v-for="group in peopleGroups"
            :key="group.key"
            type="button"
            class="shrink-0 rounded-full border px-3 py-2 text-xs transition"
            :class="
              activeTeamKey === group.key
                ? 'border-amber-300 bg-amber-300 text-zinc-950'
                : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25'
            "
            @click="activeTeamKey = group.key"
          >
            {{ group.label }} · {{ group.people.length }}
          </button>
        </div>
        <div
          ref="peopleScroller"
          class="-mr-5 mt-4 flex snap-x snap-proximity gap-3 overflow-x-auto pb-2 pr-5 sm:mr-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pr-0 lg:grid-cols-8"
        >
          <article
            v-for="(person, index) in activeTeam?.people ?? []"
            :key="`${activeTeamKey}-${person.name}`"
            class="w-24 shrink-0 snap-start"
            :class="{ 'sm:hidden': !teamExpanded && index >= 8 }"
          >
            <film-poster
              :src="person.photo_url"
              :alt="person.name"
              variant="person"
              class="aspect-square rounded-2xl"
            />
            <p
              class="mt-2 line-clamp-2 text-xs font-medium leading-4 text-white"
            >
              {{ person.name }}
            </p>
          </article>
        </div>
        <button
          v-if="(activeTeam?.people.length ?? 0) > 8"
          type="button"
          class="mt-5 hidden min-h-11 rounded-full border border-white/10 px-4 text-sm text-zinc-300 transition hover:border-white/25 hover:text-white sm:inline-flex sm:items-center"
          @click="teamExpanded = !teamExpanded"
        >
          {{
            teamExpanded
              ? 'Свернуть'
              : `Показать всех (${activeTeam?.people.length})`
          }}
        </button>
      </section>
    </template>
  </main>
</template>
