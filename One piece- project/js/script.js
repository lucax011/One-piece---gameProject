

 const canvas = document.querySelector('canvas');
 const c = canvas.getContext('2d');


 canvas.width =1020;
 canvas.height = 433.5;

 
 
 

 
 class Sprite {
     constructor({position, velocity, color='red', offset}) {
        this.position = position;
        this.velocity = velocity;
        this.width =50;
        this.height = 150;
        this.lastKey;
        this.attackRange = {
            position:{
                x:this.position.x,
                y:this.position.y
            },
            width:100,
            height:50,
            offset:offset
        }
        this.color = color;
        this.isAttack ;  
  
    }   


    draw(){
        
        c.fillStyle = this.color;
        c.fillRect(this.position.x,this.position.y,this.width,this.height);
        if (this.isAttack) {
            
            c.fillStyle = 'green'
            c.fillRect(this.attackRange.position.x,this.attackRange.position.y,this.attackRange.width,this.attackRange.height);
        }
    }
    
    update(){
        this.draw();
        
        this.attackRange.position.x = this.position.x + this.attackRange.offset.x
        this.attackRange.position.y = this.position.y 
        
        this.position.y += this.velocity.y ;
        this.position.x += this.velocity.x ;
      
        if(this.position.y +this.height + this.velocity.y >= canvas.height){
        this.velocity.y=0;
        }else this.velocity.y += gravity; 
   
  
  
    }
    attack(){

        this.isAttack= true;
        setTimeout(() => {
            this.isAttack= false;
            
        }, 100);

    }

}


 const key={
    a:{
        pressed:false
    },
    d:{
        pressed:false
    },
    arrowLeft:{
        pressed:false
    },
    arrowRight:{
    pressed:false

    },
  
 }
 
 const player = new Sprite({
    velocity:{
    x:0,
    y:10
    },
  
    position: {
     x:0,
     y:0    
    },
    color: 'blue',
    offset:{
        x:0,
        y:0
    }
});

const enemy = new Sprite({
    velocity:{
        x:0,
        y:10
    },
    
    position: {
        x:400,
        y:0
    }, 
    offset:{
        x:-50,
        y:0
    }
});

   let lastKey;

   function retangularColision({retangulo1,retangulo2}) {
   return(

       retangulo1.attackRange.position.x + retangulo1.attackRange.width >= retangulo2.position.x &&
       retangulo2.position.x+ retangulo2.width >= retangulo1.attackRange.position.x && 
       retangulo1.attackRange.position.y+ retangulo1.attackRange.height >= retangulo2.position.y &&
       retangulo2.position.y+ retangulo2.height >= retangulo1.attackRange.position.y 
    
       )
   }
    

   function animate() {
       window.requestAnimationFrame(animate);
       c.fillStyle = 'black'
       c.fillRect(0,0,canvas.width,canvas.height);
       player.update();
       enemy.update();
       player.velocity.x=0;
       enemy.velocity.x=0;
      
       if (key.a.pressed && player.lastKey==='a') {
         player.velocity.x=-5;
        }else if(key.d.pressed && player.lastKey==='d'){
            player.velocity.x=5;
        } 
       
        if (key.arrowRight.pressed && enemy.lastKey==='ArrowRight') {
            enemy.velocity.x=5;
        }else if(key.arrowLeft.pressed && enemy.lastKey==='ArrowLeft'){
            enemy.velocity.x=-5;
       } 
     
       if ( retangularColision ({
           retangulo1 : player,
           retangulo2 : enemy
        }
       )  && player.isAttack) {
            

             console.log('piru');
             player.isAttack= false;
        }
    
        if ( retangularColision ({
           retangulo1 : enemy,
           retangulo2 : player
        }
       )  && enemy.isAttack) {
            

             console.log('enemy');
             enemy.isAttack= false;
        }


}
    
    const gravity=0.2;
    

    window.addEventListener('keydown', (e) => {
        
  switch (e.key) {
    case 'd':
        key.d.pressed=true;
       player.lastKey='d';
        break;
   case 'a':
        key.a.pressed=true;
       player.lastKey='a';
        break;
    case 'w':
       player.velocity.y= -10;  
      player.lastKey='w';
        break;
    case 'f':
       player.attack();
        break;

    default:
        break;
  }
   switch (e.key) {
   
       case 'ArrowRight':
           key.arrowRight.pressed=true;
           enemy.lastKey='ArrowRight';
           break;
        case 'ArrowLeft':
            key.arrowLeft.pressed=true;
            enemy.lastKey='ArrowLeft';
            break;
        case 'ArrowUp':
            enemy.velocity.y= -10;  
            break;
        case '0':
            enemy.attack(); 
            break;
        default:
            break;
   }
                    })
               
 window.addEventListener('keyup', (e) => {
        
  switch (e.key) {
    case 'd':
        key.d.pressed=false;
        break;
   case 'a':
        key.a.pressed=false;
        break;

        
    default:
        break;
  }
  switch (e.key) {
     case 'ArrowRight':
        key.arrowRight.pressed=false;
        break;
   case 'ArrowLeft':
        key.arrowLeft.pressed=false;
        break;
    default:
        break;
  }
    
})

    animate();