import { useStore } from '../../store/useStore'
import { Spaceship } from './Spaceship'

export function SpaceshipManager() {
    const flights = useStore((state) => state.flights)
    const removeFlight = useStore((state) => state.removeFlight)

    return (
        <group>
            {flights.map((flight) => (
                <Spaceship
                    key={flight.id}
                    start={flight.start}
                    end={flight.end}
                    color={flight.color}
                    onComplete={() => removeFlight(flight.id)}
                />
            ))}
        </group>
    )
}
