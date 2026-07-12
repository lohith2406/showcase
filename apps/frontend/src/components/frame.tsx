/*
  Corner brackets — the "Focus" signature. Drop <Corners /> inside any
  position:relative container to frame it. `focus` tints the brackets amber to
  mark the element that currently has focus.
*/
export function Corners({
  focus = false,
  size = 13,
}: {
  focus?: boolean;
  size?: number;
}) {
  const style = focus
    ? { borderColor: "var(--focus)", width: size, height: size }
    : { width: size, height: size };
  return (
    <>
      <span className="corner tl" style={style} />
      <span className="corner tr" style={style} />
      <span className="corner bl" style={style} />
      <span className="corner br" style={style} />
    </>
  );
}
