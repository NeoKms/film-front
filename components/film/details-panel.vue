<script setup lang="ts">
import type { IFilmItem } from '~/stores/film';
import { EPersonPosition } from '~/stores/person';

const props = defineProps<{ film: IFilmItem }>();

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
const unavailablePhotos = ref(new Set<string>());
const peopleScroller = ref<HTMLElement | null>(null);
const personKey = (person: IFilmItem['person_items'][number]) =>
  `${person.position}:${person.name}:${person.photo_url ?? ''}`;
const setPhotoAvailability = (
  person: IFilmItem['person_items'][number],
  available: boolean,
) => {
  const next = new Set(unavailablePhotos.value);
  const key = personKey(person);
  const wasUnavailable = next.has(key);
  if (wasUnavailable === !available) return;
  if (available) next.delete(key);
  else next.add(key);
  unavailablePhotos.value = next;
  void nextTick(() => {
    if (peopleScroller.value) peopleScroller.value.scrollLeft = 0;
  });
};
const isPersonPhotoUnavailable = (
  person: IFilmItem['person_items'][number],
) =>
  isMissingImageUrl(person.photo_url) ||
  unavailablePhotos.value.has(personKey(person));
const peopleGroups = computed(() => {
  const grouped = new Map<string, IFilmItem['person_items']>();
  for (const person of props.film.person_items ?? []) {
    const people = grouped.get(person.position) ?? [];
    people.push(person);
    grouped.set(person.position, people);
  }
  return [...grouped]
    .sort(
      ([left], [right]) =>
        positionOrder.indexOf(left as EPersonPosition) -
        positionOrder.indexOf(right as EPersonPosition),
    )
    .map(([position, people]) => ({
      key: position,
      label: positionLabels[position as EPersonPosition] ?? position,
      people: [...people].sort(
        (left, right) =>
          Number(isPersonPhotoUnavailable(left)) -
          Number(isPersonPhotoUnavailable(right)),
      ),
    }));
});
const activeTeamKey = ref('');
watch(
  peopleGroups,
  (groups) => {
    if (!groups.some((group) => group.key === activeTeamKey.value))
      activeTeamKey.value = groups[0]?.key ?? '';
  },
  { immediate: true },
);
const activeTeam = computed(() =>
  peopleGroups.value.find((group) => group.key === activeTeamKey.value),
);
const trailerEmbedUrl = computed(() => {
  if (!props.film.trailer_url) return null;
  try {
    const url = new URL(props.film.trailer_url);
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
</script>

<template>
  <div class="min-w-0">
    <section
      class="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-900"
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
      <div class="relative grid gap-5 p-4 sm:grid-cols-[10rem_1fr] sm:p-6">
        <film-poster
          :src="film.poster_url"
          :alt="film.name"
          class="mx-auto aspect-[2/3] w-36 rounded-2xl shadow-2xl shadow-black/50 sm:w-full"
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
          <h2
            class="mt-3 text-2xl font-semibold leading-tight text-white sm:text-4xl"
          >
            {{ film.name }}
          </h2>
          <p class="mt-2 text-sm text-zinc-300">
            {{ film.year
            }}<template v-if="film.duration">
              · {{ film.duration }} мин</template
            ><template v-if="film.country_names.length">
              · {{ film.country_names.join(', ') }}</template
            >
          </p>
          <div v-if="film.tag_names.length" class="mt-4 flex flex-wrap gap-2">
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
      class="mt-5 grid min-w-0 gap-5"
      :class="{ 'lg:grid-cols-2': trailerEmbedUrl }"
    >
      <article
        class="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5"
      >
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
        >
          Сюжет
        </p>
        <p
          class="mt-3 break-words whitespace-pre-line text-sm leading-7 text-zinc-300 [overflow-wrap:anywhere]"
        >
          {{ film.description || 'Описание пока отсутствует.' }}
        </p>
      </article>
      <article
        v-if="trailerEmbedUrl"
        class="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-900"
      >
        <div class="px-5 py-4">
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
          >
            Трейлер
          </p>
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
      class="mt-5 min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-5"
    >
      <p
        class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300"
      >
        Команда фильма
      </p>
      <div class="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-2">
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
        class="-mr-5 mt-3 flex snap-x snap-proximity gap-3 overflow-x-auto pb-3 pr-5"
      >
        <article
          v-for="person in activeTeam?.people ?? []"
          :key="`${activeTeamKey}-${person.name}`"
          class="w-24 shrink-0 snap-start"
        >
          <film-poster
            :src="person.photo_url"
            :alt="person.name"
            variant="person"
            class="aspect-square rounded-xl"
            @availability="setPhotoAvailability(person, $event)"
          />
          <p class="mt-2 line-clamp-2 text-xs font-medium leading-4 text-white">
            {{ person.name }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>
