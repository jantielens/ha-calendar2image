# Installation Guide

## Installing the Add-on

### 1. Add the Repository

1. In Home Assistant, navigate to **Settings** → **Add-ons** → **Add-on Store**
2. Click the **⋮** menu (top right) → **Repositories**
3. Add this repository URL:
   ```
   https://github.com/jantielens/ha-calendar2image
   ```
4. Click **Add** → **Close**

### 2. Install Calendar2Image

1. Find **Calendar2Image** in the add-on store
2. Click on it → **Install**
3. Wait for installation to complete (may take a few minutes)

### 3. Configure the Port (Optional)

1. Go to the **Configuration** tab
2. Set the port (default: 3000):
   ```yaml
   port: 3000
   ```
3. Click **Save**

### 4. Start the Add-on

1. Go to the **Info** tab
2. Enable **Start on boot** (recommended)
3. Click **Start**
4. Check the **Log** tab to verify it's running

You should see:
```
Startup complete - ready to serve requests
```

## Initial Setup

### Default Configuration

The add-on automatically creates a working configuration on first startup:

**Location:** `/addon_configs/17f877f5_calendar2image/`

**Files created:**
- `0.json` - Working configuration with Google US Holidays calendar
- `README.md` - Configuration documentation
- `templates/custom-week-view.js` - Sample custom template

### Testing the Installation

1. Open your browser and navigate to:
   ```
   http://homeassistant.local:3000/api/0.png
   ```
   *(Replace `homeassistant.local` with your Home Assistant IP if needed)*

2. You should see a calendar image with US holidays

3. Check the CRC32 checksum:
   ```
   http://homeassistant.local:3000/api/0.png.crc32
   ```

### Viewing Configuration Files

**Using File Editor Add-on (recommended):**
1. Install the **File Editor** add-on if not already installed
2. **Configure File Editor** to access add-on config folders:
   - Go to File Editor add-on → Configuration tab
   - Set `enforce_basepath: false` ([documentation](https://github.com/home-assistant/addons/blob/master/configurator/DOCS.md#option-enforce_basepath-required))
   - Save and restart File Editor add-on
3. Navigate to `/addon_configs/17f877f5_calendar2image/`
4. Edit `0.json` to configure your own calendar

**Using SSH/Terminal:**
1. Connect via SSH or Terminal add-on
2. Navigate to:
   ```bash
   cd /addon_configs/17f877f5_calendar2image/
   ls -la
   ```

## Next Steps

1. **View the configuration dashboard**: Open `http://homeassistant.local:3000/` to see all your configurations
2. **Explore configuration details**: Click the orange "Config" button to see an interactive visualization with validation
3. **Configure your calendar**: Edit `0.json` and replace the `icsUrl` with your own calendar feed
4. **Create additional calendars**: Copy `0.json` to `1.json`, `2.json`, etc.
5. **Customize templates**: See [Template Development Guide](TEMPLATE-DEVELOPMENT.md)
6. **Integrate with Home Assistant**: Use the API endpoints in automations, dashboards, or e-ink displays

## Troubleshooting

### Add-on won't start

**Check the logs:**
1. Go to **Info** tab → **Log**
2. Look for error messages

**Common issues:**
- Port already in use → Change port in configuration
- Insufficient memory → Restart Home Assistant
- Docker issues → Restart Docker service

### Can't access the API

**Verify the add-on is running:**
```
http://homeassistant.local:3000/health
```

Should return:
```json
{"status": "healthy"}
```

**Check firewall settings:**
- Ensure port 3000 (or your configured port) is accessible
- Try accessing from the Home Assistant host first

### Configuration files not created

1. Stop the add-on
2. Manually create `/addon_configs/17f877f5_calendar2image/` directory
3. Start the add-on - files will be auto-created

## Support

For issues and questions:
- GitHub Issues: https://github.com/jantielens/ha-calendar2image/issues
- Home Assistant Community Forum: [Link TBD]
