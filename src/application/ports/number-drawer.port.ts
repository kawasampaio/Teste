export const NUMBER_DRAWER =
  Symbol('NUMBER_DRAWER');

export interface NumberDrawerPort {
  draw(
    min: number,
    max: number,
  ): number;
}