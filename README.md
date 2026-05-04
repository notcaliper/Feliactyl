![Feliactyl](https://media.discordapp.net/attachments/1000768414220038204/1157727962569900192/Heliactyl-preview.png)

<hr>

# Feliactyl v1.0

Feliactyl is a fork of [Heliactyl](https://github.com/Heliactyl-Project/Heliactyl) 13.3, maintained by [notcaliper](https://github.com/notcaliper). Rebranded and re-versioned starting at **v1.0**.

All features:
- Resource Management (Use it to create servers, etc)
- Coins (AFK Page earning, Linkvertise earning, Gift them away)
- Renewal (Require coins for renewal)
- Coupons (Gives resources & coins to a user)
- Servers (create, view, edit servers)
- Payments (Buy Coins via Stripe)
- Login Queue (prevent hitting the rate-limits)
- User System (auth, regen password, etc)
- Store (buy resources with coins)
- Dashboard (view resources)
- Join for Rewards (join discord servers for coins)
- Admin (set/add/remove coins & resources, create/revoke coupons)
- API (for bots & other things)

# Warning

We cannot force you to keep the "Powered by Feliactyl" in the footer, but please consider keeping it. It helps getting more visibility to the project and so getting better. We won't provide technical support for installations without the notice in the footer. We may file a DMCA takedown if the website using our Software shares false information or proclaims to be the Software Developers.

We kindly ask you to keep the footer :)

<hr>

# Install Guide

**Caution:** Ensure that Pterodactyl is already configured on a domain or else Feliactyl may not function properly.

Access your VPS through SSH and run these Commands:

```bash
1. sudo apt update -y && sudo apt upgrade -y
2. sudo apt install nginx
3. cd /var/www
4. # Download and unzip the latest Feliactyl release from GitHub into the current folder
5. curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   # Customize the settings.json file, specifically updating the panel domain, API key, and Discord authentication settings.
6. node . # Start Feliactyl. Take a look at "Running in background and on startup" if you want Feliactyl to run in the background
          # Ctrl + C to stop Feliactyl
7. sudo apt install certbot
8. sudo ufw allow 80
9. sudo ufw allow 443
10. sudo certbot certonly -d <Your Feliactyl Domain>
11. nano /etc/nginx/sites-enabled/feliactyl.conf
12. # Copy the Ngnix config from # Nginx Proxy Config and replace <domain> with your domain and <port> with the Port Feliactyl is running on 
    # (You can find the port in the settings.json)
13. sudo systemctl restart nginx
14. # Attempt to access your Feliactyl domain


# Nginx Proxy Config
server {
    listen 80;
    server_name <domain>;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;

    location /afkwspath {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_pass "http://localhost:<port>/afkwspath";
    }
    
    server_name <domain>;
    ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols SSLv3 TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers  HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
      proxy_pass http://localhost:<port>/;
      proxy_buffering off;
      proxy_set_header X-Real-IP $remote_addr;
  }
}
```

<hr>

# Additional Configuration

#### **Changing the EGG IDs**:
 Pterodactyl often changes the IDs of the EGGs so you might need to change the IDs in the settings.json to match the Pterodactyl ones
 You can find the eggs for Minecraft by using `YourPanelDomain.net/admin/nests/view/1`. Replace YourPanelDomain.net with the actual Domain of your Pterodactyl Installation

How to other eggs (Minecraft Bedrock):
1. [Download the eggs from Parkervcp's GitHub Repository](https://github.com/parkervcp/eggs)
2. Add the Pocketmine & Vanilla Bedrock eggs to your panel
3. Get the egg ID of both of them and set it as the ID in settings.json

# Updating 

Migrating from Heliactyl v13.x to Feliactyl v1:
1. Store important info (API keys, Discord auth settings, etc.) somewhere safe
2. Download `database.sqlite` (contains user and server data) 
3. Delete the old Heliactyl directory contents
4. Upload the latest Feliactyl v1 release and unzip it
5. Restore `database.sqlite` and reconfigure `settings.json`

Updating to a newer Feliactyl v1 release:
1. Keep `settings.json` and `database.sqlite`, delete everything else
2. Back up both files somewhere safe first
3. Upload the latest Feliactyl v1 release and unzip it
4. Restore `settings.json` and `database.sqlite`
5. Start Feliactyl again

# Running in background and on startup
Installing [pm2](https://github.com/Unitech/pm2):
- Run `npm install pm2 -g` on the vps

Starting the Dashboard in Background:
- Change directory to your Feliactyl folder Using `cd` command, Example: `cd /var/www/feliactyl` 
- To run Feliactyl, use `pm2 start index.js --name "feliactyl"`
- To view logs, run `pm2 logs Feliactyl`

Making the dashboard runs on startup:
- Make sure your dashboard is running in the background with the help of [pm2](https://github.com/Unitech/pm2)
- You can check if Feliactyl is running in background with `pm2 list`
- Once you confirmed that Feliactyl is running in background, you can create a startup script by running `pm2 startup` and `pm2 save`
- Note: Supported init systems are `systemd`, `upstart`, `launchd`, `rc.d`
- To stop your Feliactyl from running in the background, use `pm2 unstartup`

To stop a currently running Feliactyl instance, use `pm2 stop feliactyl`

# Legacy Deprecation Notice

Legacy Heliactyl versions (pre-13.3) are not supported by this fork. Please use Feliactyl v1 or later.

