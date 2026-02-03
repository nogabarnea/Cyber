import http.server
import socketserver
import json
import os
from urllib.parse import parse_qs, urlparse
from crypto import encrypt, decrypt, generate_password

PORT = 8083
HOST = "127.0.0.1"
DATA_FILE = "passwords_data.json"

#bring passwords from json
def load_passwords():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

#save all passwords to jason
def save_passwords(passwords):
    with open(DATA_FILE, 'w') as f:
        json.dump(passwords, f, indent=2)


class PasswordManager(http.server.SimpleHTTPRequestHandler):    
    def do_GET(self):
        parsed = urlparse(self.path)
        #get all passwords
        if parsed.path == '/api/passwords':
            self.send_json_response(load_passwords())
            return
        #generate password
        if parsed.path == '/api/generate':
            password = generate_password(12)
            self.send_json_response({"password": password})
            return
        super().do_GET()
    
    
    def do_POST(self):
        parsed = urlparse(self.path) #resolve path
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8') #convert to text
        try:
            if post_data:
                data = json.loads(post_data)
            else:   
                data = {}    
        except:
            data = {}
        #add password
        if parsed.path == '/api/passwords':
            service = data.get('service', '')
            username = data.get('username', '')
            password = data.get('password', '')
            if not service or not username or not password: #check if every data is there
                self.send_json_response({"error": "Missing fields"}, 400)
                return     
            encrypted = encrypt(password)        
            import time
            entry = {
                "id": int(time.time() * 1000), # id of pass is time * 1000
                "service": service,
                "username": username,
                "password": encrypted,
                "createdAt": time.strftime("%m/%d/%Y") #date created
            }   
            passwords = load_passwords()
            passwords.append(entry)
            save_passwords(passwords)
            self.send_json_response({"success": True, "entry": entry})
            return
        
        if parsed.path == '/api/decrypt': # if I want to show password
            encrypted = data.get('encrypted', '')
            if encrypted:
                decrypted = decrypt(encrypted)
                self.send_json_response({"decrypted": decrypted})
            else:
                self.send_json_response({"error": "No data"}, 400) #has to be decrypted, return error
            return
        self.send_json_response({"error": "Not found"}, 404)
    
    def do_DELETE(self):
        parsed = urlparse(self.path) #resolve path
        if parsed.path.startswith('/api/passwords/'):
            try:
                entry_id = int(parsed.path.split('/')[-1])
                passwords = load_passwords()
                passwords = [p for p in passwords if p['id'] != entry_id] # load evrything but the deleted one
                save_passwords(passwords)
                self.send_json_response({"success": True})
            except:
                self.send_json_response({"error": "Invalid ID"}, 400)
            return
        if parsed.path == '/api/passwords': #clear every paaword
            save_passwords([])
            self.send_json_response({"success": True})
            return
        self.send_json_response({"error": "Not found"}, 404)
    
    #############################
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    ###############################


#open TCP server - socket server - alawys on
def main():
    print(f"Starting server at http://{HOST}:{PORT}")
    print()
    with socketserver.TCPServer((HOST, PORT), PasswordManager) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(" Server stopped")


if __name__ == "__main__":
    main()

