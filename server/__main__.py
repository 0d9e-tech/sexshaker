from aiohttp import web
import socketio
import json
import os
import datetime

sio = socketio.AsyncServer(cors_allowed_origins=[
    '*'
    'http://localhost:5173',
    'https://localhost:5173',
    'https://sexshaker.cz',
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
        f.write(json.dumps(ev) + '\n')


def load_events():
    if not os.path.isfile('events.json'):
        return

    with open('events.json') as f:
        for line in f:
            ev = json.loads(line)
            do_event_no_save(ev)


@sio.event
def connect(sid, environ, auth):
    print("connect", sid)
    print("auth", auth)

    if auth not in user_scores:
        do_event({'type': 'register', 'user': auth, 'ts': datetime.datetime.now().timestamp()})

    session_context[sid] = {}
    session_context[sid]['user'] = auth
    do_event({'sid': sid, 'type': 'connect', 'user': session_context[sid]['user'], 'ts': datetime.datetime.now().timestamp()})

@sio.on('*')
def any_event(event, sid, data):
    if not sid in session_context:
        print("User not connected, how??")
        return

    ddata = data if type(data) is dict else {}
    do_event({**ddata, 'type': event, 'user': session_context[sid]['user'], 'ts': datetime.datetime.now().timestamp()})

@sio.event
def disconnect(sid):
    print('disconnect ', sid)
    do_event({'sid': sid, 'type': 'disconnect', 'user': session_context[sid]['user'], 'ts': datetime.datetime.now().timestamp()})
    session_context.pop(sid)


if __name__ == '__main__':
    web.run_app(app)
