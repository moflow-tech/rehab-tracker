// Dev-only page (?gallery) to check every routine illustration at once.
import { ILLUSTRATIONS, Illustration } from './components/Illustration';

export default function Gallery() {
  return (
    <div className="gallery">
      {Object.keys(ILLUSTRATIONS).map((id) => (
        <section key={id} className="card">
          <h2>{id}</h2>
          <Illustration id={id} />
        </section>
      ))}
    </div>
  );
}
