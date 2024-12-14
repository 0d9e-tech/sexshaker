from aiohttp import web
import socketio

sio = socketio.AsyncServer()
app = web.Application()
sio.attach(app)

@sio.event
def connect(sid, environ, auth):
    print("connect ", sid)
    print("auth ", auth)

@sio.event
async def sex(sid, data):
    print("sex ", data)

@sio.event
def disconnect(sid):
    print('disconnect ', sid)

if __name__ == '__main__':
    web.run_app(app)
