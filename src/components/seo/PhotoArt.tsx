/* A catalogue photo in the site's art format: an <svg> with an <image>, so it sizes like the engine's art
   (app.css hides any .art box without an svg). Works on the server and in the browser. */
export default function PhotoArt({ id, label, full }: { id: string; label?: string; full?: boolean }) {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ width: '100%', height: '100%', display: 'block' }}>
      <image href={`/img/${full ? 'f' : 't'}/${id}.webp`} width="400" height="240" preserveAspectRatio="xMidYMid slice" />
    </svg>
  );
}
