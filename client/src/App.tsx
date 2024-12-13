import { createSignal } from 'solid-js'
import './App.css'

function App() {
    const [count, setCount] = createSignal(0);
    let fapping = false;

    const acl = new Accelerometer({ frequency: 60 });

    acl.addEventListener('reading', () => {
        if (!acl.y) 
            return;
        
        if (!fapping && acl.y > 12) {
            fapping = true;
            // THIS is where a fap happens
            setCount(count() + 1);
        }
        else if (fapping && acl.y < 12) {
            fapping = false;
        }
    });
    
    acl.start();
    
    return (
        <div style={{ 'font-size': '160px' }}>
            <p>
                {count()}
            </p>
        </div>
    );
}

export default App
