import http.server
from http.server import *
import glob
import shutil
import os

class s_builder:
	text = ""

	def add(self, s):
		self.text += s

	def add_line(self, s):
		self.text += s + "\n"
#------------------------------------

def run(server_class=HTTPServer, handler_class=SimpleHTTPRequestHandler):
	files = glob.glob("C:/Users/34687/Desktop/Dev/Python/twitch_bot/sounds/*.mp3")
	list_of_files = []
	for f in files:
		target = os.getcwd()
		slash_index = f.rfind("\\")
		if slash_index == -1:
			slash_index = f.rfind("/")
		filename = f[slash_index + 1: ]
		target += "/" + filename
		shutil.copyfile(f, target)
		list_of_files.append(filename)

	b = s_builder()
	b.add_line("<!DOCTYPE html>")
	b.add_line("<html>")
	b.add_line("<body>")

	b.add_line("<script>")
	b.add_line(
		"""
		function callback(param)
		{
			const audio = new Audio(param);
			audio.play();
		}
		"""
	)

	b.add_line("let button = undefined")
	for f in list_of_files:
		b.add_line("button = document.createElement(\"BUTTON\");")
		# b.add_line("button.addEventListener(\"click\", () => callback(\"%s\"));" % f)
		# b.add_line("button.onclick=callback(%s);" % f)
		b.add_line("button.onclick=() => callback(\"%s\");" % f)
		b.add_line("button.textContent = \"%s\";" % f[0:f.find(".mp3")])
		b.add_line("document.body.appendChild(button);")

	b.add_line("</script>")

	b.add_line("</body>")
	b.add_line("</html>")

	with open("index.html", "w") as f:
		f.write(b.text)

	server_address = ('', 8000)
	httpd = server_class(server_address, handler_class)
	httpd.serve_forever()
run()