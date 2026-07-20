import type { FilmItemPerson } from '~/stores/film';
import type { EPersonPosition } from '~/stores/person';

export interface FilmPeopleGroup {
  position: string;
  people: FilmItemPerson[];
}

export const groupFilmPeople = (
  people: FilmItemPerson[],
  positionOrder: EPersonPosition[],
): FilmPeopleGroup[] => {
  const grouped = new Map<string, FilmItemPerson[]>();
  for (const person of people) {
    const positionPeople = grouped.get(person.position) ?? [];
    positionPeople.push(person);
    grouped.set(person.position, positionPeople);
  }

  return [...grouped]
    .sort(
      ([left], [right]) =>
        positionOrder.indexOf(left as EPersonPosition) -
        positionOrder.indexOf(right as EPersonPosition),
    )
    .map(([position, positionPeople]) => ({
      position,
      people: [...positionPeople].sort((left, right) => {
        if (
          !Number.isInteger(left.billing_order) ||
          !Number.isInteger(right.billing_order) ||
          left.billing_order === right.billing_order
        ) {
          return 0;
        }
        return left.billing_order - right.billing_order;
      }),
    }));
};
