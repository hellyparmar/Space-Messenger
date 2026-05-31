import { useState } from 'react'
import { useStore } from '../../store/useStore'

export function SearchOverlay() {
    const [query, setQuery] = useState('')

    const handleSearch = (e) => {
        e.preventDefault()
        if (!query.trim()) return

        const contacts = useStore.getState().contacts
        const target = contacts.find(c => c.name.toLowerCase().includes(query.toLowerCase()))

        if (target) {
            console.log("Found:", target.name)
            useStore.getState().addFlight({
                start: [0, 0, 0],
                end: target.position,
                color: '#00ffff'
            })
            useStore.getState().setActiveChat(target.id)
        }
        setQuery('')
    }

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 1000
        }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a star..."
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '24px',
                        padding: '10px 20px',
                        color: 'white',
                        backdropFilter: 'blur(5px)',
                        outline: 'none',
                        fontSize: '1rem',
                        width: '250px'
                    }}
                />
            </form>
        </div>
    )
}
