import './src/config/envLoader.js';
import * as ftp from 'basic-ftp';

async function testConnection() {
    console.log("--- FTP Connection Test ---");
    console.log("Host:", process.env.FTP_HOST);
    console.log("User:", process.env.FTP_USER);
    // console.log("Password:", process.env.FTP_PASSWORD); // Hide password

    const client = new ftp.Client();
    client.ftp.verbose = true;

    try {
        console.log("\nAttempting to connect...");
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false
        });
        
        console.log("\n✅ CONNECTION ESTABLISHED SUCCESSFULLY!");
        
        console.log("\nChecking remote root directory...");
        const remoteRoot = (process.env.FTP_REMOTE_ROOT || 'uploads');
        console.log("Remote Root:", remoteRoot);
        
        try {
            await client.cd(remoteRoot);
            console.log(`✅ Directory '${remoteRoot}' exists and is accessible.`);
        } catch (err) {
            console.log(`⚠️  Directory '${remoteRoot}' not found. Attempting to create it...`);
            await client.ensureDir(remoteRoot);
            console.log(`✅ Directory '${remoteRoot}' created successfully.`);
        }

        console.log("\nListing directory contents:");
        const list = await client.list();
        console.log(list.map(item => `${item.type === 1 ? 'd' : '-'} ${item.name}`).join('\n'));

    } catch (err) {
        console.error("\n❌ CONNECTION FAILED!");
        console.error("Error Message:", err.message);
        console.error("Stack Trace:", err.stack);
    } finally {
        client.close();
        console.log("\n--- Test Complete ---");
    }
}

testConnection();
