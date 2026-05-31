import { useStore } from '../../store/useStore'
import { useState } from 'react'

export function ChatOverlay() {
    const activeChat = useStore((state) => state.activeChat)
    const closeChat = useStore((state) => state.closeChat)
    const [inputText, setInputText] = useState('')

    if (!activeChat) return null

    const handleSend = (e) => {
        e.preventDefault()
        if (!inputText.trim()) return

        // Trigger spaceship from Sun (0,0,0) to activeChat position
        useStore.getState().addFlight({
            start: [0, 0, 0],
            end: activeChat.position,
            color: '#ffff00' // Yellow/Gold message
        })

        console.log(`Sending to ${activeChat.name}: ${inputText}`)
        setInputText('')
    }

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '500px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            zIndex: 1000,
            boxShadow: '0 0 40px rgba(0,0,0,0.5)'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{activeChat.name}</h2>
                <button
                    onClick={closeChat}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '1.5rem',
                        cursor: 'pointer'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto'
            }}>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', marginTop: '20px' }}>
                    No messages yet. Start the conversation!
                </div>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{
                padding: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '8px'
            }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message to the stars..."
                    style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: 'white',
                        outline: 'none'
                    }}
                />
                <button
                    type="submit"
                    style={{
                        background: activeChat.color || '#white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: 'black',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Send
                </button>
            </form>
        </div>
    )
}
