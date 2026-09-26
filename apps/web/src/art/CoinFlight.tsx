import { motion } from "framer-motion";
import { CoinArt } from "./CoinArt";

export interface Flight {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  count: number;
}

/**
 * Des pièces volent d'un point à un autre (ex. du bouton vers le coffre) : la seule animation
 * qui montre ce qui vient de changer. Montée en arc, 650 ms, décalées de 70 ms.
 */
export function CoinFlight({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const dx = flight.to.x - flight.from.x;
  const dy = flight.to.y - flight.from.y;
  return (
    <div className="coin-flight" aria-hidden="true">
      {Array.from({ length: flight.count }, (_, i) => (
        <motion.div
          key={`${flight.id}-${i}`}
          className="coin-flight-coin"
          style={{ left: flight.from.x - 18, top: flight.from.y - 18 }}
          initial={{ x: (i - (flight.count - 1) / 2) * 14, y: 0, scale: 0.6, opacity: 0 }}
          animate={{ x: [null, dx * 0.5 + (i - 1) * 10, dx], y: [null, dy * 0.5 - 90, dy], scale: [0.6, 1.1, 0.7], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.65, delay: i * 0.07, ease: [0.23, 1, 0.32, 1], times: [0, 0.5, 1] }}
          onAnimationComplete={i === flight.count - 1 ? onDone : undefined}
        >
          <CoinArt size={36} />
        </motion.div>
      ))}
    </div>
  );
}
