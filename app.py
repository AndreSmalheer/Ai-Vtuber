from flask import Flask, render_template

app = Flask(__name__, static_folder='public')

@app.route('/')
def home():
    return render_template('index.html')  

@app.route('/overlay')
def overlay():
    return render_template('overlay.html') 

if __name__ == '__main__':
    app.run(debug=True)
