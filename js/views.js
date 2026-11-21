
const targetUrl = 'https://beno.violate.lol/';
const url = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

fetch(url, {
    method: 'GET',
})
.then(response => response.json())
.then(data => {
    console.log(data);
    document.getElementById('visit-count').textContent = `${data.VisitCount}`;
})
.catch(error => console.error('Error fetching visit count:', error));
