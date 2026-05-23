# CodeIgniter Host Integration Guide

This document provides integration examples for embedding the Analytics AI widget
into the existing CodeIgniter PHP host application.

---

## 1. Iframe Embedding — Chat Widget

Add the following to any CodeIgniter view file where you want the analytics widget:

```php
<!-- analytics-ai-agent-tool/docs/codeigniter/views/analytics_widget.php -->
<div id="analytics-widget-container" style="width: 100%; height: 600px; border: none; border-radius: 8px; overflow: hidden;">
    <iframe
        id="analytics-ai-iframe"
        src="http://localhost:8080/ai/chat?mode=embedded"
        style="width: 100%; height: 100%; border: none;"
        allow="clipboard-write"
        title="Logistics Analytics AI"
    ></iframe>
</div>
```

For production, replace `http://localhost:8080` with your deployed NGINX URL.

---

## 2. Previous Reports — Left Navigation Menu (PHP)

Fetch and display saved reports in the PHP left panel:

```php
<!-- In your CodeIgniter controller -->
<?php
class AnalyticsController extends CI_Controller {

    public function sidebar_reports() {
        $api_base = 'http://localhost:8080/api'; // or production URL

        $ch = curl_init("{$api_base}/users/reports");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        curl_close($ch);

        $reports = json_decode($response, true) ?: [];
        $this->load->view('analytics_sidebar', ['reports' => $reports]);
    }
}
```

```php
<!-- analytics_sidebar.php view -->
<ul class="analytics-reports-menu">
    <?php foreach ($reports as $report): ?>
    <li>
        <a href="<?= $report['url'] ?>" target="_blank" rel="noopener">
            <?= htmlspecialchars($report['title']) ?>
            <small><?= date('d M Y', strtotime($report['created_at'])) ?></small>
        </a>
    </li>
    <?php endforeach; ?>
</ul>
```

---

## 3. JavaScript Integration — Open Report in Iframe

```html
<!-- In the host page, load a specific report inside the iframe -->
<script>
function openAnalyticsReport(reportId) {
    const iframe = document.getElementById('analytics-ai-iframe');
    if (iframe) {
        iframe.src = `http://localhost:8080/ai/reports/${reportId}`;
    }
}

// Listen for postMessage events from the widget
window.addEventListener('message', function(event) {
    if (event.origin !== 'http://localhost:8080') return;
    if (event.data.type === 'report_generated') {
        openAnalyticsReport(event.data.report_id);
    }
});
</script>
```

---

## 4. CORS & Frame Embedding Configuration

The NGINX configuration already includes the required headers.
Update `infrastructure/nginx/nginx.conf` with the production CodeIgniter host origin:

```nginx
# Replace localhost:8081 with your production CodeIgniter host URL
add_header Content-Security-Policy "frame-ancestors https://your-codeigniter-host.com http://localhost:8081" always;
add_header Access-Control-Allow-Origin "https://your-codeigniter-host.com" always;
```

Update `.env` accordingly:
```
ALLOWED_ORIGINS=https://your-codeigniter-host.com,http://localhost:8081
FRAME_ANCESTORS=https://your-codeigniter-host.com
```
