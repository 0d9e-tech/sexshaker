from aiohttp import web
import socketio
import json
import os

sio = socketio.AsyncServer(cors_allowed_origins=[
    'http://localhost:5173',
    'https://sexshaker.cz',
    '*'
])
app = web.Application()
sio.attach(app)

user_scores = {}
session_context = {}


def do_event_no_save(ev):
    match ev['type']:
        case 'sex':
            user_scores[ev['user']] += 1
        case 'register':
            user_scores[ev['user']] = 0


def do_event(ev):
    do_event_no_save(ev)
    save_event(ev)


def save_event(ev):
    with open('events.json', 'a') as f:
        f.write(json.dumps(ev))


def load_events():
    if not os.path.isfile('events.json'):
        return

    with open('events.json') as f:
        for line in f:
            ev = json.loads(line)
            do_event(ev)


@sio.event
def connect(sid, environ, auth):
    print("connect ", sid)
    print("auth ", auth)

    if not user_scores[auth]:
        do_event({'type': 'register', 'user': auth})

    session_context[sid] = {}
    session_context[sid]['user'] = auth


@sio.event
async def sex(sid, data):
    print("sex ", data)

    if not sid in session_context:
        print("User not connected")
        return

    do_event({'type': 'sex', 'user': session_context[sid]['user']})


@sio.event
def disconnect(sid):
    print('disconnect ', sid)

    session_context.pop(sid)


if __name__ == '__main__':
    web.run_app(app)
