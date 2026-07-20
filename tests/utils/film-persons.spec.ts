import { describe, expect, test } from 'vitest';
import type { EPersonPosition } from '../../stores/person';
import type { FilmItemPerson } from '../../stores/film';
import { groupFilmPeople } from '../../utils/film-persons';

const Positions = {
  Directors: 'directors' as EPersonPosition,
  Actors: 'actors' as EPersonPosition,
};
const positionOrder = [Positions.Directors, Positions.Actors];

const person = (
  name: string,
  position: EPersonPosition,
  billingOrder: number,
): FilmItemPerson => ({
  name,
  position,
  billing_order: billingOrder,
  photo_url: null,
});

describe('groupFilmPeople', () => {
  test('keeps role order and sorts people by billing order', () => {
    const groups = groupFilmPeople(
      [
        person('Director', Positions.Directors, 5),
        person('Supporting', Positions.Actors, 8),
        person('Lead', Positions.Actors, 0),
      ],
      positionOrder,
    );

    expect(groups.map((group) => group.position)).toEqual([
      Positions.Directors,
      Positions.Actors,
    ]);
    expect(groups[1]?.people.map(({ name }) => name)).toEqual([
      'Lead',
      'Supporting',
    ]);
  });

  test('keeps API order for equal billing values before applying a limit', () => {
    const actors = [
      person('Ninth', Positions.Actors, 9),
      person('First equal', Positions.Actors, 0),
      person('Second equal', Positions.Actors, 0),
      ...Array.from({ length: 6 }, (_, index) =>
        person(`Actor ${index + 1}`, Positions.Actors, index + 1),
      ),
    ];

    const [actorsGroup] = groupFilmPeople(
      actors,
      positionOrder,
    );

    expect(actorsGroup?.people.slice(0, 8).map(({ name }) => name)).toEqual([
      'First equal',
      'Second equal',
      'Actor 1',
      'Actor 2',
      'Actor 3',
      'Actor 4',
      'Actor 5',
      'Actor 6',
    ]);
  });
});
